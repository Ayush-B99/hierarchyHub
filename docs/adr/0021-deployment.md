# 0021. Deploying to AWS on one address

- Status: Accepted
- Date: 2026-10-08
- Replaces: the hosting details of [0004](0004-aws-hosting.md)

## Context

ADR 0004 planned the web app on Amplify and the API behind its own CloudFront address. Since then, signing in arrived (ADR 0016) with an `httpOnly`, same-site session cookie. Browsers increasingly block cookies sent between two different sites, so the web app and the API should share one address. The account is also on AWS's Free plan, which can never be charged, so everything has to fit inside its credits.

The Free plan account turned out to sit inside an AWS-managed organisation with service control policies that override even administrator permissions. Deploying hit two of them:

- **Only the region the account was created in is allowed.** CloudFormation in Ireland (`eu-west-1`) was refused with an explicit deny, while Stockholm (`eu-north-1`) worked. Global services (CloudFront, IAM) are unaffected.
- **Identity providers can't be created**, so GitHub Actions can't be given short-lived credentials through OpenID Connect.

## Decision

- **One CloudFront address for everything.** The web app's files come from a private S3 bucket, and `/api/*` goes to the API. The session cookie is first-party, and the API's `CORS_ORIGIN` is that one address. Live at **https://d6atm0gw3zjf0.cloudfront.net**.
- **The API runs as one small container** (0.25 vCPU, 0.5 GB) on ECS Fargate behind an Application Load Balancer. The load balancer only accepts traffic from CloudFront's addresses, and only requests carrying a header that CloudFront adds. Anything else gets 403.
- **PostgreSQL 16 on RDS**, the smallest instance (`db.t4g.micro`, 20 GB, encrypted), in subnets with no route to the internet. Only the API's security group can reach it, over TLS checked against Amazon's certificates.
- **No NAT gateway.** The API container gets a public address only to pull its image and secrets. Its security group accepts traffic from the load balancer only.
- **Passwords live in Secrets Manager.** The API only gets the `hh_app` password. A separate operations task, run on demand, holds the admin and migrator passwords for setting up the database, running migrations and loading sample data.
- **The API may start before its database is ready** in production (`DATABASE_STARTUP_CHECK=warn`). On a fresh deploy the database users are created just after the API first starts, so a strict check would make AWS restart it until the deploy gives up. Its liveness check doesn't touch the database, and the readiness check reports the database as down until it's reachable. Locally the check stays strict.
- **Everything is code** (AWS CDK, TypeScript, in `infra/`), with tests that check the security and cost choices: no NAT gateway, a private and encrypted database, the API reachable only through CloudFront, secrets going only where they're needed, and the startup setting.
- **Region: Europe (Stockholm), `eu-north-1`,** the only region this account allows. It's in the EU and priced about the same as Ireland. It's one setting (`AWS_REGION`) to change on an account without the restriction.
- **Deploys run from a laptop** with `task aws:deploy`. The GitHub deploy role is still in the code, behind `GITHUB_DEPLOY=true`, for accounts that allow identity providers. The Deploy workflow skips itself while no role is configured.
- **The live database was loaded once with the sample employees, accounts and six weeks of sample history,** using `task aws:load-sample`. It only runs against an empty database. Each account gets its own generated password, saved to Secrets Manager rather than printed or logged. The history events are tagged `seeded` in the database.

## Consequences

- Roughly $55 to $65 a month at list prices, covered by the Free plan's credits for the length of the assessment. The Free plan can never produce a bill.
- Shipping a change means running `task aws:deploy`, then `task aws:migrate` if it added a migration.
- `task aws:destroy` removes everything, including the database.
- The address is the one CloudFront generated. A custom domain needs a certificate from US East, which this account's region rule is likely to block.
