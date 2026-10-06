# Deploying to AWS

This sets up the live site on AWS, inside the Free plan's credits (ADR 0021). It takes about 30 minutes, most of it waiting.

## 1. Before you start

- An AWS account on the **Free plan**, with multi-factor authentication on the root user.
- An IAM user for yourself with `AdministratorAccess` and its own multi-factor authentication.
- The [AWS CLI](https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html), and Docker Desktop running.

Create an access key for your IAM user (IAM > Users > your user > Security credentials), then on your machine:

```bash
aws configure
# region: eu-west-1, output: json
aws sts get-caller-identity   # shows your account, so you know it works
```

Never commit the access key or paste it anywhere. Delete it once GitHub Actions is deploying for you (step 5).

## 2. First deploy

```bash
task aws:bootstrap   # once per account: prepares AWS for CDK
task aws:deploy      # builds the web app and creates everything, about 15 to 20 minutes
```

At the end it prints `SiteUrl`, your live address, and `GithubDeployRole`. The site loads, but signing in won't work until the database is set up.

## 3. Set up the database

```bash
task aws:setup         # creates the database users and the database, then runs the migrations
task aws:load-sample   # loads the sample people, accounts and history. Type y to confirm
task aws:passwords     # shows each sample account and its generated password
```

Save the passwords somewhere safe, like a password manager. They're only stored as hashes in the database, and in Secrets Manager for `task aws:passwords`. Give the assessors the logins privately, not in the repo.

## 4. Check it works

Open the `SiteUrl`, sign in as `thandi.nkosi@example.com`, and try Explore, People, Audit and time travel.

## 5. Let GitHub deploy for you

In the repo on GitHub: **Settings > Secrets and variables > Actions > Variables**, add:

| Name                  | Value                              |
| --------------------- | ---------------------------------- |
| `AWS_DEPLOY_ROLE_ARN` | the `GithubDeployRole` from step 2 |
| `AWS_REGION`          | `eu-west-1`                        |

From now on, every change that passes CI on `main` deploys automatically, and new migrations run straight after. You can delete your access key now.

## Costs and turning it off

Roughly $55 to $65 a month at list prices, paid from your Free plan credits. The Free plan can't be charged. When the credits run out, AWS closes the account instead of billing you.

When the assessment is done:

```bash
task aws:destroy   # deletes the site and its database, for good
```
