import { fileURLToPath } from 'node:url';
import {
  Aws,
  CfnOutput,
  Duration,
  Fn,
  RemovalPolicy,
  Stack,
  type StackProps,
  aws_cloudfront as cloudfront,
  aws_cloudfront_origins as origins,
  aws_ec2 as ec2,
  aws_ecr_assets as assets,
  aws_ecs as ecs,
  aws_elasticloadbalancingv2 as elbv2,
  aws_iam as iam,
  aws_logs as logs,
  aws_rds as rds,
  aws_s3 as s3,
  aws_s3_deployment as deploy,
  aws_secretsmanager as secrets,
} from 'aws-cdk-lib';
import type { Construct } from 'constructs';

const REPO_ROOT = fileURLToPath(new URL('../../', import.meta.url));
const DB_NAME = 'hierarchy_hub';
const API_PORT = 3000;

export interface HierarchyHubProps extends StackProps {
  githubRepo: string;
  githubDeploy?: boolean;
  cloudfrontPrefixListId?: string;
  webDist?: string;
}

export class HierarchyHubStack extends Stack {
  constructor(scope: Construct, id: string, props: HierarchyHubProps) {
    super(scope, id, props);

    const vpc = new ec2.Vpc(this, 'Vpc', {
      maxAzs: 2,
      natGateways: 0,
      subnetConfiguration: [
        { name: 'public', subnetType: ec2.SubnetType.PUBLIC, cidrMask: 24 },
        { name: 'data', subnetType: ec2.SubnetType.PRIVATE_ISOLATED, cidrMask: 24 },
      ],
    });

    const albSg = new ec2.SecurityGroup(this, 'AlbSg', { vpc, allowAllOutbound: true });
    const apiSg = new ec2.SecurityGroup(this, 'ApiSg', { vpc, allowAllOutbound: true });
    const dbSg = new ec2.SecurityGroup(this, 'DbSg', { vpc, allowAllOutbound: false });

    const cloudfrontPrefixListId =
      props.cloudfrontPrefixListId ??
      ec2.PrefixList.fromLookup(this, 'CloudFrontIps', {
        prefixListName: 'com.amazonaws.global.cloudfront.origin-facing',
      }).prefixListId;
    albSg.addIngressRule(ec2.Peer.prefixList(cloudfrontPrefixListId), ec2.Port.tcp(80));
    apiSg.addIngressRule(albSg, ec2.Port.tcp(API_PORT));
    dbSg.addIngressRule(apiSg, ec2.Port.tcp(5432));

    const db = new rds.DatabaseInstance(this, 'Database', {
      engine: rds.DatabaseInstanceEngine.postgres({ version: rds.PostgresEngineVersion.VER_16 }),
      instanceType: ec2.InstanceType.of(ec2.InstanceClass.T4G, ec2.InstanceSize.MICRO),
      vpc,
      vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE_ISOLATED },
      securityGroups: [dbSg],
      credentials: rds.Credentials.fromGeneratedSecret('hh_admin'),
      allocatedStorage: 20,
      maxAllocatedStorage: 20,
      storageType: rds.StorageType.GP3,
      multiAz: false,
      publiclyAccessible: false,
      storageEncrypted: true,
      backupRetention: Duration.days(1),
      deletionProtection: false,
      removalPolicy: RemovalPolicy.DESTROY,
    });

    const password = (name: string) =>
      new secrets.Secret(this, name, {
        generateSecretString: { excludePunctuation: true, passwordLength: 32 },
      });
    const appPassword = password('AppDbPassword');
    const migratorPassword = password('MigratorDbPassword');
    const samplePasswords = new secrets.Secret(this, 'SamplePasswords', {
      description: 'Passwords for the sample accounts, written once by the load-sample task',
    });

    const bucket = new s3.Bucket(this, 'Web', {
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      enforceSSL: true,
      encryption: s3.BucketEncryption.S3_MANAGED,
      removalPolicy: RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
    });

    const alb = new elbv2.ApplicationLoadBalancer(this, 'Alb', {
      vpc,
      internetFacing: true,
      securityGroup: albSg,
      vpcSubnets: { subnetType: ec2.SubnetType.PUBLIC },
    });
    const originSecret = Fn.select(2, Fn.split('/', Aws.STACK_ID));

    const spaRoutes = new cloudfront.Function(this, 'SpaRoutes', {
      runtime: cloudfront.FunctionRuntime.JS_2_0,
      code: cloudfront.FunctionCode.fromInline(
        "function handler(event) { var r = event.request; if (r.uri.indexOf('.') === -1) { r.uri = '/index.html'; } return r; }",
      ),
    });

    const site = new cloudfront.Distribution(this, 'Site', {
      defaultRootObject: 'index.html',
      httpVersion: cloudfront.HttpVersion.HTTP2_AND_3,
      defaultBehavior: {
        origin: origins.S3BucketOrigin.withOriginAccessControl(bucket),
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED,
        responseHeadersPolicy: cloudfront.ResponseHeadersPolicy.SECURITY_HEADERS,
        functionAssociations: [
          { function: spaRoutes, eventType: cloudfront.FunctionEventType.VIEWER_REQUEST },
        ],
      },
      additionalBehaviors: {
        '/api/*': {
          origin: new origins.LoadBalancerV2Origin(alb, {
            protocolPolicy: cloudfront.OriginProtocolPolicy.HTTP_ONLY,
            customHeaders: { 'X-Origin-Verify': originSecret },
          }),
          viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.HTTPS_ONLY,
          allowedMethods: cloudfront.AllowedMethods.ALLOW_ALL,
          cachePolicy: cloudfront.CachePolicy.CACHING_DISABLED,
          originRequestPolicy: cloudfront.OriginRequestPolicy.ALL_VIEWER_EXCEPT_HOST_HEADER,
        },
      },
    });
    const siteUrl = `https://${site.distributionDomainName}`;

    const image = ecs.ContainerImage.fromAsset(REPO_ROOT, {
      file: 'apps/api/Dockerfile',
      platform: assets.Platform.LINUX_AMD64,
    });
    const cluster = new ecs.Cluster(this, 'Cluster', { vpc });
    const logGroup = new logs.LogGroup(this, 'Logs', {
      retention: logs.RetentionDays.TWO_WEEKS,
      removalPolicy: RemovalPolicy.DESTROY,
    });

    const dbEnv = { DB_HOST: db.dbInstanceEndpointAddress, DB_PORT: '5432', DB_NAME };

    const apiTask = new ecs.FargateTaskDefinition(this, 'ApiTask', {
      cpu: 256,
      memoryLimitMiB: 512,
    });
    apiTask.addContainer('api', {
      image,
      command: ['api'],
      portMappings: [{ containerPort: API_PORT }],
      logging: ecs.LogDrivers.awsLogs({ logGroup, streamPrefix: 'api' }),
      environment: {
        ...dbEnv,
        CORS_ORIGIN: siteUrl,
        TRUST_PROXY: '2',
      },
      secrets: { APP_DB_PASSWORD: ecs.Secret.fromSecretsManager(appPassword) },
    });

    const service = new ecs.FargateService(this, 'Api', {
      cluster,
      taskDefinition: apiTask,
      desiredCount: 1,
      assignPublicIp: true,
      vpcSubnets: { subnetType: ec2.SubnetType.PUBLIC },
      securityGroups: [apiSg],
      minHealthyPercent: 100,
      maxHealthyPercent: 200,
      circuitBreaker: { rollback: true },
    });

    const listener = alb.addListener('Http', {
      port: 80,
      open: false,
      defaultAction: elbv2.ListenerAction.fixedResponse(403, {
        contentType: 'text/plain',
        messageBody: 'Forbidden',
      }),
    });
    listener.addTargets('Api', {
      priority: 1,
      conditions: [elbv2.ListenerCondition.httpHeader('X-Origin-Verify', [originSecret])],
      port: API_PORT,
      protocol: elbv2.ApplicationProtocol.HTTP,
      targets: [service],
      deregistrationDelay: Duration.seconds(10),
      healthCheck: { path: '/api/health', healthyHttpCodes: '200', interval: Duration.seconds(15) },
    });

    const opsTask = new ecs.FargateTaskDefinition(this, 'OpsTask', {
      cpu: 256,
      memoryLimitMiB: 1024,
    });
    opsTask.addContainer('ops', {
      image,
      command: ['migrate'],
      logging: ecs.LogDrivers.awsLogs({ logGroup, streamPrefix: 'ops' }),
      environment: { ...dbEnv, SAMPLE_PASSWORDS_SECRET: samplePasswords.secretArn },
      secrets: {
        APP_DB_PASSWORD: ecs.Secret.fromSecretsManager(appPassword),
        MIGRATOR_DB_PASSWORD: ecs.Secret.fromSecretsManager(migratorPassword),
        MASTER_DB_USER: ecs.Secret.fromSecretsManager(db.secret!, 'username'),
        MASTER_DB_PASSWORD: ecs.Secret.fromSecretsManager(db.secret!, 'password'),
      },
    });
    samplePasswords.grantWrite(opsTask.taskRole);

    new deploy.BucketDeployment(this, 'WebFiles', {
      sources: [deploy.Source.asset(props.webDist ?? `${REPO_ROOT}apps/web/dist`)],
      destinationBucket: bucket,
      distribution: site,
      distributionPaths: ['/*'],
      memoryLimit: 512,
    });

    const output = (name: string, value: string) => new CfnOutput(this, name, { value });
    output('SiteUrl', siteUrl);
    output('ClusterName', cluster.clusterName);
    output('OpsTaskDefinition', opsTask.taskDefinitionArn);
    output('ApiSecurityGroup', apiSg.securityGroupId);
    output('PublicSubnets', vpc.publicSubnets.map((s) => s.subnetId).join(','));
    output('LogGroup', logGroup.logGroupName);
    output('SamplePasswordsSecret', samplePasswords.secretArn);

    if (props.githubDeploy) {
      const github = new iam.OpenIdConnectProvider(this, 'GithubOidc', {
        url: 'https://token.actions.githubusercontent.com',
        clientIds: ['sts.amazonaws.com'],
      });
      const deployRole = new iam.Role(this, 'GithubDeploy', {
        assumedBy: new iam.WebIdentityPrincipal(github.openIdConnectProviderArn, {
          StringEquals: { 'token.actions.githubusercontent.com:aud': 'sts.amazonaws.com' },
          StringLike: {
            'token.actions.githubusercontent.com:sub': [
              `repo:${props.githubRepo}:ref:refs/heads/main`,
              `repo:${props.githubRepo}:environment:production`,
            ],
          },
        }),
        maxSessionDuration: Duration.hours(1),
      });
      deployRole.addToPolicy(
        new iam.PolicyStatement({
          actions: ['sts:AssumeRole'],
          resources: [`arn:${Aws.PARTITION}:iam::${Aws.ACCOUNT_ID}:role/cdk-*`],
        }),
      );
      deployRole.addToPolicy(
        new iam.PolicyStatement({
          actions: [
            'ecs:RunTask',
            'ecs:DescribeTasks',
            'cloudformation:DescribeStacks',
            'logs:GetLogEvents',
          ],
          resources: ['*'],
        }),
      );
      deployRole.addToPolicy(
        new iam.PolicyStatement({
          actions: ['iam:PassRole'],
          resources: [opsTask.taskRole.roleArn, opsTask.obtainExecutionRole().roleArn],
        }),
      );
      output('GithubDeployRole', deployRole.roleArn);
    }
  }
}
