import { App } from 'aws-cdk-lib';
import { HierarchyHubStack } from '../lib/stack';

const app = new App();

new HierarchyHubStack(app, 'HierarchyHub', {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.AWS_REGION ?? process.env.CDK_DEFAULT_REGION ?? 'eu-north-1',
  },
  githubRepo: process.env.GITHUB_REPO ?? 'Ayush-B99/hierarchyHub',
  githubDeploy: process.env.GITHUB_DEPLOY === 'true',
  description: 'Hierarchy Hub: web app, API and database',
});
