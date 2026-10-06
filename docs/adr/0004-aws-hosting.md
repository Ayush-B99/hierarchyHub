# 0004. Host on AWS with Amplify, ECS Fargate and RDS

- Status: Accepted. The hosting details were replaced by [0021](0021-deployment.md)
- Date: 2026-10-02

## Context

The app must run in the cloud with a public URL and a remote database. We chose AWS. We want HTTPS, low cost, and a setup we can rebuild from code.

## Options

| Option                                    | Pros                                                                                     | Cons                                               |
| ----------------------------------------- | ---------------------------------------------------------------------------------------- | -------------------------------------------------- |
| A single EC2 server                       | Cheap, full control.                                                                     | We must patch and manage the server.               |
| AWS App Runner or Elastic Beanstalk       | Less setup.                                                                              | Less control. Less common in modern setups.        |
| AWS Lambda                                | Pay per request.                                                                         | Cold starts. Database connections need extra care. |
| ECS Fargate with RDS, frontend on Amplify | No servers to manage. Same container locally and in the cloud. Common in real companies. | More pieces to set up.                             |

## Decision

| Need                      | AWS service                                                                  |
| ------------------------- | ---------------------------------------------------------------------------- |
| Host the web app          | Amplify Hosting. Builds from GitHub and serves over HTTPS.                   |
| Run the API               | ECS Fargate, behind an Application Load Balancer.                            |
| HTTPS for the API         | CloudFront in front of the load balancer. No custom domain needed.           |
| Database                  | RDS for PostgreSQL 16, smallest size (`db.t4g.micro`), in private subnets.   |
| Passwords                 | Secrets Manager.                                                             |
| Define everything in code | AWS CDK in TypeScript.                                                       |
| Region                    | Cape Town (`af-south-1`). Ireland (`eu-west-1`) if Cape Town is not enabled. |

We do not use a NAT gateway, to keep costs down.

## Consequences

- The whole setup can be created with one command and removed with one command.
- The API runs the same way on a laptop and in AWS because it is a Docker container.
- If the API container fails, AWS replaces it automatically.
- The load balancer and Fargate are not free forever. We keep sizes small and remove everything after the assessment.
