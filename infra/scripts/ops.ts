import { CloudFormationClient, DescribeStacksCommand } from '@aws-sdk/client-cloudformation';
import { CloudWatchLogsClient, GetLogEventsCommand } from '@aws-sdk/client-cloudwatch-logs';
import { DescribeTasksCommand, ECSClient, RunTaskCommand } from '@aws-sdk/client-ecs';
import { GetSecretValueCommand, SecretsManagerClient } from '@aws-sdk/client-secrets-manager';

/* eslint-disable no-console */

const STACK = 'HierarchyHub';
const COMMANDS = ['setup', 'migrate', 'load-sample', 'passwords'] as const;
type Command = (typeof COMMANDS)[number];

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function outputs(): Promise<Record<string, string>> {
  const { Stacks } = await new CloudFormationClient({}).send(
    new DescribeStacksCommand({ StackName: STACK }),
  );
  const result: Record<string, string> = {};
  for (const o of Stacks?.[0]?.Outputs ?? []) {
    if (o.OutputKey && o.OutputValue) result[o.OutputKey] = o.OutputValue;
  }
  return result;
}

async function printLogs(logGroup: string, taskId: string) {
  const { events } = await new CloudWatchLogsClient({}).send(
    new GetLogEventsCommand({
      logGroupName: logGroup,
      logStreamName: `ops/ops/${taskId}`,
      startFromHead: true,
    }),
  );
  for (const e of events ?? []) console.log(`  ${e.message}`);
}

async function runTask(command: Exclude<Command, 'passwords'>) {
  const out = await outputs();
  const ecs = new ECSClient({});
  const environment =
    command === 'load-sample' ? [{ name: 'CONFIRM', value: process.env.CONFIRM ?? '' }] : [];

  const { tasks, failures } = await ecs.send(
    new RunTaskCommand({
      cluster: out.ClusterName,
      taskDefinition: out.OpsTaskDefinition,
      launchType: 'FARGATE',
      networkConfiguration: {
        awsvpcConfiguration: {
          subnets: (out.PublicSubnets ?? '').split(','),
          securityGroups: [out.ApiSecurityGroup ?? ''],
          assignPublicIp: 'ENABLED',
        },
      },
      overrides: { containerOverrides: [{ name: 'ops', command: [command], environment }] },
    }),
  );
  const taskArn = tasks?.[0]?.taskArn;
  if (!taskArn) throw new Error(`Couldn't start the task: ${JSON.stringify(failures)}`);
  const taskId = taskArn.split('/').pop() ?? '';
  console.log(`Running "${command}" on AWS, this takes a minute or two...`);

  for (;;) {
    await sleep(5000);
    const { tasks: described } = await ecs.send(
      new DescribeTasksCommand({ cluster: out.ClusterName, tasks: [taskArn] }),
    );
    const task = described?.[0];
    if (task?.lastStatus !== 'STOPPED') continue;

    await printLogs(out.LogGroup ?? '', taskId).catch(() => undefined);
    const exitCode = task.containers?.[0]?.exitCode;
    if (exitCode !== 0)
      throw new Error(`"${command}" failed (${task.stoppedReason ?? `exit code ${exitCode}`})`);
    console.log(`"${command}" finished.`);
    return;
  }
}

async function showPasswords() {
  const out = await outputs();
  const { SecretString } = await new SecretsManagerClient({}).send(
    new GetSecretValueCommand({ SecretId: out.SamplePasswordsSecret }),
  );
  const accounts = JSON.parse(SecretString ?? '[]') as {
    email: string;
    password: string;
    status: string;
    isAdmin: boolean;
  }[];
  if (!Array.isArray(accounts) || accounts.length === 0) {
    console.log('No sample passwords yet. Run: task aws:load-sample');
    return;
  }
  console.log(`Sign in at ${out.SiteUrl}\n`);
  for (const a of accounts) {
    const note = a.status === 'pending' ? 'waiting for approval' : a.isAdmin ? 'admin' : '';
    console.log(`  ${a.email.padEnd(32)} ${a.password}  ${note}`);
  }
}

async function main() {
  const command = process.argv[2] as Command;
  if (!COMMANDS.includes(command)) {
    console.error(`Usage: pnpm ops <${COMMANDS.join('|')}>`);
    process.exit(1);
  }
  if (command === 'passwords') await showPasswords();
  else await runTask(command);
}

main().catch((error: Error) => {
  console.error(error.message);
  process.exitCode = 1;
});
