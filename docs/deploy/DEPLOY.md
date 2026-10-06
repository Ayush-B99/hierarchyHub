# Deploying to AWS

This sets up the live site on AWS, inside the Free plan's credits (ADR 0021). It takes about 30 minutes, most of it waiting. The current live site is **https://d6atm0gw3zjf0.cloudfront.net**.

## 1. Before you start

- An AWS account on the **Free plan**, with multi-factor authentication on your sign-in.
- An IAM user with `AdministratorAccess` and no console password, used only from the command line. IAM > Users > Create user, then **Attach policies directly**.
- The AWS CLI (`brew install awscli`), and Docker Desktop running.

Create an access key for that user (IAM > Users > the user > Security credentials > Create access key > Command Line Interface), then on your machine:

```bash
aws configure                  # paste the key and secret, region eu-north-1, output json
aws sts get-caller-identity    # should show user/<your user>
```

Never commit the access key or paste it anywhere.

Free plan accounts may only allow the region they were created in. Check yours before going further:

```bash
aws cloudformation list-stacks --region eu-north-1 --query "StackSummaries[0]"
```

`null` means the region is allowed. `AccessDenied` means try the region your console opens in, and use it everywhere below.

## 2. First deploy

```bash
task aws:bootstrap   # once per account and region: prepares AWS for CDK
task aws:deploy      # builds the web app and the API image, then creates everything. About 15 to 25 minutes
```

At the end it prints `SiteUrl`, your live address. The site loads, but signing in won't work until the database is set up.

If a first deploy fails, CloudFormation removes what it created. Wait for `ROLLBACK_COMPLETE`, fix the cause, and run `task aws:deploy` again:

```bash
aws cloudformation describe-stacks --stack-name HierarchyHub --query "Stacks[0].StackStatus"
```

## 3. Set up the database

```bash
task aws:setup         # creates the database users and the database, then runs the migrations
task aws:load-sample   # loads the sample people, accounts and history. Type y to confirm
task aws:passwords     # shows each sample account and its generated password
```

Save the passwords somewhere safe, like a password manager. They're only stored as hashes in the database, and in Secrets Manager for `task aws:passwords`. Give the assessors the logins privately, not in the repo.

## 4. Check it works

```bash
curl -s https://<your SiteUrl>/api/health/ready   # should include "database":"up"
```

Then open the `SiteUrl`, sign in as `thandi.nkosi@example.com`, and try Explore, People, Audit and time travel.

## 5. Shipping changes

```bash
task aws:deploy    # after merging to main
task aws:migrate   # only if the change added a migration
```

The Deploy workflow in GitHub Actions is ready for accounts that allow identity providers: deploy once with `GITHUB_DEPLOY=true task aws:deploy`, then add the `GithubDeployRole` output as the `AWS_DEPLOY_ROLE_ARN` repository variable, and `AWS_REGION`. Free plan accounts refuse to create the identity provider, so on those, deploy from your machine as above.

## Costs and turning it off

Roughly $55 to $65 a month at list prices, paid from your Free plan credits. The Free plan can't be charged. When the credits run out, AWS closes the account instead of billing you. Check what's left under your account menu, **Free plan status**.

When the assessment is done:

```bash
task aws:destroy   # deletes the site and its database, for good
```

Then delete the IAM user's access key.
