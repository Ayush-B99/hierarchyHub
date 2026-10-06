import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { App } from 'aws-cdk-lib';
import { Match, Template } from 'aws-cdk-lib/assertions';
import { beforeAll, describe, expect, it } from 'vitest';
import { HierarchyHubStack } from '../lib/stack';

let template: Template;

beforeAll(() => {
  const webDist = mkdtempSync(join(tmpdir(), 'web-'));
  writeFileSync(join(webDist, 'index.html'), '<!doctype html>');
  const app = new App();
  const stack = new HierarchyHubStack(app, 'Test', {
    env: { account: '123456789012', region: 'eu-west-1' },
    githubRepo: 'owner/repo',
    cloudfrontPrefixListId: 'pl-cloudfront',
    webDist,
  });
  template = Template.fromStack(stack);
});

const resources = (type: string) =>
  Object.values(template.findResources(type)) as {
    Properties: Record<string, unknown>;
  }[];

describe('costs stay inside the free credits', () => {
  it('has no nat gateway', () => {
    template.resourceCountIs('AWS::EC2::NatGateway', 0);
  });

  it('runs the smallest database, on one machine, with 20 GB', () => {
    template.hasResourceProperties('AWS::RDS::DBInstance', {
      DBInstanceClass: 'db.t4g.micro',
      MultiAZ: false,
      AllocatedStorage: '20',
      MaxAllocatedStorage: 20,
    });
  });

  it('runs one small api container', () => {
    template.hasResourceProperties('AWS::ECS::Service', { DesiredCount: 1, LaunchType: 'FARGATE' });
    template.hasResourceProperties('AWS::ECS::TaskDefinition', { Cpu: '256', Memory: '512' });
  });
});

describe('the database is private', () => {
  it('is not reachable from the internet, and is encrypted', () => {
    template.hasResourceProperties('AWS::RDS::DBInstance', {
      PubliclyAccessible: false,
      StorageEncrypted: true,
    });
  });

  it('only accepts connections from the api’s security group', () => {
    const rules = resources('AWS::EC2::SecurityGroupIngress').filter(
      (r) => r.Properties.ToPort === 5432,
    );
    expect(rules).toHaveLength(1);
    expect(rules[0]?.Properties.SourceSecurityGroupId).toBeDefined();
    expect(rules[0]?.Properties.CidrIp).toBeUndefined();
  });
});

describe('the api is only reachable through cloudfront', () => {
  it('lets only cloudfront reach the load balancer, and nothing is open to everyone', () => {
    template.hasResourceProperties('AWS::EC2::SecurityGroupIngress', {
      SourcePrefixListId: 'pl-cloudfront',
      FromPort: 80,
    });
    const open = resources('AWS::EC2::SecurityGroupIngress').filter(
      (r) => r.Properties.CidrIp === '0.0.0.0/0',
    );
    expect(open).toHaveLength(0);
    for (const group of resources('AWS::EC2::SecurityGroup')) {
      expect(group.Properties.SecurityGroupIngress).toBeUndefined();
    }
  });

  it('refuses anything without the secret header', () => {
    template.hasResourceProperties('AWS::ElasticLoadBalancingV2::Listener', {
      DefaultActions: [
        Match.objectLike({
          Type: 'fixed-response',
          FixedResponseConfig: Match.objectLike({ StatusCode: '403' }),
        }),
      ],
    });
    template.hasResourceProperties('AWS::ElasticLoadBalancingV2::ListenerRule', {
      Conditions: [Match.objectLike({ Field: 'http-header' })],
    });
  });

  it('never caches the api, and passes cookies through', () => {
    template.hasResourceProperties('AWS::CloudFront::Distribution', {
      DistributionConfig: Match.objectLike({
        CacheBehaviors: [
          Match.objectLike({
            PathPattern: '/api/*',
            ViewerProtocolPolicy: 'https-only',
            CachePolicyId: '4135ea2d-6df8-44a3-9df3-4b5a84be39ad',
          }),
        ],
      }),
    });
  });
});

describe('secrets go only where they’re needed', () => {
  const containerSecrets = (name: string) => {
    const defs = resources('AWS::ECS::TaskDefinition').flatMap(
      (r) => r.Properties.ContainerDefinitions as { Name: string; Secrets?: { Name: string }[] }[],
    );
    return (defs.find((c) => c.Name === name)?.Secrets ?? []).map((s) => s.Name).sort();
  };

  it('gives the api only its own database password', () => {
    expect(containerSecrets('api')).toEqual(['APP_DB_PASSWORD']);
  });

  it('keeps the admin and migration passwords for the operations task', () => {
    expect(containerSecrets('ops')).toEqual([
      'APP_DB_PASSWORD',
      'MASTER_DB_PASSWORD',
      'MASTER_DB_USER',
      'MIGRATOR_DB_PASSWORD',
    ]);
  });
});

describe('github can deploy, and only from main', () => {
  it('trusts only the main branch and the production environment of this repo', () => {
    template.hasResourceProperties('AWS::IAM::Role', {
      AssumeRolePolicyDocument: Match.objectLike({
        Statement: [
          Match.objectLike({
            Condition: Match.objectLike({
              StringLike: {
                'token.actions.githubusercontent.com:sub': [
                  'repo:owner/repo:ref:refs/heads/main',
                  'repo:owner/repo:environment:production',
                ],
              },
            }),
          }),
        ],
      }),
    });
  });
});
