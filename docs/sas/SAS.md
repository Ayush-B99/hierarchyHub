# Software Architecture Specification (SAS)

|         |                                                                                                 |
| ------- | ----------------------------------------------------------------------------------------------- |
| Project | Hierarchy Hub                                                                                   |
| Version | 1.0                                                                                             |
| Date    | October 2026                                                                                    |
| Related | [SRS](../srs/SRS.md), [ADRs](../adr/README.md), [Technical document](../technical/TECHNICAL.md) |

## 1. Purpose

This document explains how Hierarchy Hub is built. It shows the main parts of the system, how they talk to each other, how data is stored, and where everything is hosted. The diagrams follow the [C4 model](https://c4model.com/), which looks at the system at different levels of detail: first the whole system, then its main parts, then the pieces inside each part.

## 2. What drives the design

These requirements have the biggest effect on how the system is built.

| Requirement                                                                     | What it means for the design                                                                   |
| ------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| No one can manage themselves and there can be no reporting loops (BR-01, BR-02) | Use a relational database that can enforce rules. Check for loops before every manager change. |
| All data must be in a remote database (C-01)                                    | A managed PostgreSQL database on AWS. Only the API writes to it.                               |
| Sort and filter on any field (FR-10)                                            | Sorting and filtering happen in the database, using indexes.                                   |
| Visual org chart (FR-07)                                                        | The API sends the full list of employees once. The browser builds the tree.                    |
| Hosted in the cloud with a URL (C-03)                                           | AWS, with all resources defined in code.                                                       |
| Easy to maintain and review (NFR-09)                                            | TypeScript monorepo, shared validation rules, clear layers in the code.                        |

In order of importance, the system should be: correct, easy to use, easy to maintain, secure, cheap to run, and fast enough.

## 3. System context

The whole system and what it connects to.

```mermaid
flowchart TB
    hr(["HR administrator"])
    mgr(["Manager"])
    app["<b>Hierarchy Hub</b><br/>Manages employees and reporting lines"]
    grav["<b>Gravatar</b><br/>Profile pictures"]
    gh["<b>GitHub</b><br/>Code, CI and deployments"]

    hr -->|"adds, edits and deletes employees"| app
    mgr -->|"views the org chart and searches"| app
    app -->|"loads pictures by email hash"| grav
    gh -->|"tests and deploys"| app
```

## 4. Main parts (containers)

```mermaid
flowchart TB
    user(["Browser"])

    subgraph aws["AWS"]
        web["<b>Web app</b><br/>React + Vite<br/>Hosted on AWS Amplify"]
        cdn["<b>CloudFront</b><br/>Gives the API an HTTPS address"]
        api["<b>API</b><br/>NestJS + Prisma<br/>Docker container on ECS Fargate"]
        db[("<b>Database</b><br/>PostgreSQL on Amazon RDS")]
        secrets["<b>Secrets Manager</b><br/>Database password"]
    end

    grav["Gravatar"]

    user -->|"loads the app (HTTPS)"| web
    user -->|"API calls (HTTPS)"| cdn
    cdn --> api
    api -->|"SQL"| db
    secrets -.->|"password given at start-up"| api
    user -->|"profile pictures"| grav
```

| Part           | Job                                                                                        | Built with                                                                                                |
| -------------- | ------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------- |
| Web app        | Screens: org chart, table, forms. Checks input before sending it. Shows Gravatar pictures. | React, Vite, TanStack Query, React Router, Three.js. The org chart and table are built by hand (ADR 0014) |
| CloudFront     | Gives the API a secure HTTPS address without buying a domain name.                         | Amazon CloudFront                                                                                         |
| API            | Business rules, input checks, saving and reading data.                                     | NestJS, Prisma, Zod                                                                                       |
| Database       | Stores employees and enforces key rules.                                                   | PostgreSQL 16 on Amazon RDS                                                                               |
| Shared package | Types and validation rules used by both the web app and the API.                           | TypeScript, Zod. Not deployed on its own.                                                                 |

## 5. Inside the API

Every request passes through the same pipeline before it reaches an endpoint, then down through three layers. Each layer only talks to the one below it. Every route needs a signed in, approved account except the health checks and the sign in forms (ADR 0016), what each person may change follows the hierarchy (ADR 0017), and every change is recorded in the same transaction (ADR 0018).

```mermaid
flowchart TB
    req(["HTTPS request"])

    subgraph api["API (NestJS)"]
        subgraph pipeline["Request pipeline, in order"]
            direction LR
            helmet["<b>Helmet</b><br/>Security headers"]
            cors["<b>CORS</b><br/>Only the web app's address"]
            rid["<b>Request ID and access log</b><br/>No query strings or bodies"]
            cross["<b>Same-site check</b><br/>Changes only from the app itself"]
            body["<b>JSON body parser</b><br/>16 KB limit"]
            throttle["<b>Rate limit guard</b><br/>Reads and changes counted apart"]
            guard["<b>Session guard</b><br/>Signed in, approved account. Admin only routes"]
            helmet --> cors --> rid --> cross --> body --> throttle --> guard
        end

        subgraph authm["Auth and accounts modules"]
            authc["<b>Auth controller</b><br/>Sign up, sign in, sign out, me"]
            authsvc["<b>Auth service</b><br/>Argon2id, lockout, sessions"]
            acc["<b>Accounts</b><br/>Approve, reject, change access"]
        end

        subgraph aud["Audit module"]
            audsvc["<b>Audit service</b><br/>Writes events in the same transaction,<br/>reads them by who can see what"]
        end

        hier["<b>Hierarchy service</b><br/>Who is below whom, the reporting lines lock"]

        subgraph emp["Employees module"]
            ctrl["<b>Controller</b><br/>Routes, status codes, ETag and Location headers"]
            pipe["<b>Validation pipe</b><br/>Strict Zod schemas from the shared package"]
            ifm["<b>If-Match parser</b><br/>The version the client loaded"]
            svc["<b>Service</b><br/>Business rules, transactions"]
            repo["<b>Repository</b><br/>SQL and Prisma queries"]
            map["<b>Mapper</b><br/>Database row to API response"]
        end

        subgraph health["Health module"]
            hc["<b>Health controller</b><br/>/api/health and /api/health/ready"]
        end

        subgraph dbm["Database module"]
            dbs["<b>Database service</b><br/>Prisma client over a node-postgres pool"]
            dberr["<b>Database error mapping</b><br/>Rule names to friendly messages"]
        end

        filter["<b>Exception filter</b><br/>One JSON error shape, no internal details"]
        config["<b>Config</b><br/>Settings checked at start-up"]
    end

    shared["Shared package<br/>Schemas and types"]
    db[("PostgreSQL")]

    req --> helmet
    guard --> ctrl
    guard --> authc
    guard --> acc
    throttle --> hc
    authc --> authsvc
    authsvc --> audsvc
    acc --> audsvc
    svc --> hier
    svc --> audsvc
    audsvc --> dbs
    hier --> dbs
    authsvc --> dbs
    ctrl --> pipe
    ctrl --> ifm
    pipe -.-> shared
    ctrl --> svc
    svc --> repo
    repo --> map
    repo --> dbs
    hc --> dbs
    dbs --> db
    dberr -.-> filter
    config -.-> dbs
```

| Layer      | Does                                                  | Does not                                 |
| ---------- | ----------------------------------------------------- | ---------------------------------------- |
| Controller | Maps URLs to methods. Returns HTTP responses.         | Contain business rules or database code. |
| Service    | Applies business rules, such as "no reporting loops". | Know about HTTP or SQL.                  |
| Repository | Runs database queries.                                | Decide what is allowed.                  |

## 6. Inside the web app

```mermaid
flowchart TB
    subgraph web["Web app"]
        layout["<b>App shell</b><br/>Top bar, search, theme, 3D background"]
        subgraph pages["Pages"]
            explore["<b>Explore</b><br/>Orbit and Levels views,<br/>path to the top, details panel"]
            people["<b>People</b><br/>Sentence filters, table,<br/>paging, CSV export"]
        end
        dialogs["<b>Employee dialogs</b><br/>Add, edit, change manager,<br/>delete, confirm a move"]
        avatar["<b>Avatar</b><br/>Gravatar picture over initials"]
        query["<b>TanStack Query</b><br/>Loading, caching and refreshing data"]
        client["<b>API client</b><br/>Typed calls, sends If-Match on changes"]
    end
    shared["Shared package"]

    layout --> pages
    pages --> dialogs
    explore --> avatar
    people --> avatar
    pages --> query
    dialogs --> query
    query --> client
    dialogs -.->|"form validation"| shared
    explore -.->|"builds the tree, finds teams"| shared
```

The selected person, view, filters, sort and page are kept in the address bar, so the back button, bookmarks and shared links all work.

## 7. Main flows

### 7.1 Change an employee's manager

```mermaid
sequenceDiagram
    actor U as User
    participant W as Web app
    participant A as API
    participant D as Database

    U->>W: Pick a new manager and select Save
    W->>W: Check the form with the shared rules
    W->>A: PATCH /api/employees/{id}
    A->>A: Check the input again
    alt New manager is the same person
        A-->>W: 400 Cannot be their own manager
    else
        A->>D: Walk up from the new manager to the top
        D-->>A: List of people above the new manager
        alt The employee is in that list
            A-->>W: 400 Would create a reporting loop
        else
            A->>D: Save the new manager
            D-->>A: Saved
            A-->>W: 200 Updated employee
            W->>W: Refresh the chart and table
            W-->>U: New reporting line is shown
        end
    end
```

### 7.2 Delete an employee who manages people

```mermaid
sequenceDiagram
    actor U as User
    participant W as Web app
    participant A as API
    participant D as Database

    U->>W: Select Delete
    W-->>U: 3 people will move to Sipho. Delete?
    U->>W: Confirm
    W->>A: DELETE /api/employees/{id}
    A->>D: Start transaction
    A->>D: Move direct reports to the deleted person's manager
    A->>D: Delete the employee
    A->>D: Commit
    A-->>W: 204 Deleted
    W-->>U: Employee deleted
```

### 7.3 Load the org chart

```mermaid
sequenceDiagram
    participant W as Web app
    participant A as API
    participant D as Database
    participant G as Gravatar

    W->>A: GET /api/employees/hierarchy
    A->>D: Read all employees
    D-->>A: Employees
    A-->>W: Flat list of employees
    W->>W: Build the tree from the list
    W->>W: Show the selected person, their manager and their team
    loop For each person on screen
        W->>W: Hash the email address
        W->>G: Request picture by hash
        G-->>W: Picture, or a transparent image so the initials show through
    end
```

## 8. Data

### 8.1 How the hierarchy is stored

Each employee row has a `manager_id` column that points to another employee. If it is empty, the employee is at the top. This is called an adjacency list. It is the simplest way to store a tree, and changing someone's manager only updates one row. See [ADR 0003](../adr/0003-postgresql-adjacency-list.md) for the other options we looked at.

```mermaid
erDiagram
    EMPLOYEE |o--o{ EMPLOYEE : "manages"
    EMPLOYEE {
        uuid id PK
        string employee_number UK
        string first_name
        string last_name
        string email UK
        date birth_date
        decimal salary
        string role
        uuid manager_id FK "empty for top-level"
        int version "goes up on every change"
        datetime created_at
        datetime updated_at
    }
    EMPLOYEE |o--o| ACCOUNT : "signs in as"
    ACCOUNT ||--o{ SESSION : "has"
    ACCOUNT {
        uuid id PK
        string email UK
        string password_hash "argon2id only"
        string status "pending, active or disabled"
        boolean is_admin
        uuid employee_id FK,UK "set when approved"
        int failed_logins
        datetime locked_until
    }
    SESSION {
        string id PK "sha-256 of the cookie"
        uuid account_id FK
        datetime expires_at
    }
    AUDIT_EVENT {
        uuid id PK
        datetime at
        string action
        string actor_name "copied at the time"
        string subject_name "copied at the time"
        uuid_array scope "the subject and everyone above them then"
        json changes "each field before and after"
    }
```

Accounts link to employees one to one. Sessions belong to an account and are deleted with it. Audit events deliberately have no links to anything: they copy the names and positions they need at the time, so they still read correctly after people are renamed, moved or deleted, and deleting someone can never touch their history. The audit table is append only (ADR 0018).

### 8.2 Rules enforced by the database

| Rule                                                                 | How                                                                                                                                              |
| -------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| Not their own manager (BR-01)                                        | A check constraint: `manager_id` must not equal `id`.                                                                                            |
| Manager must exist, and can't be deleted while people report to them | A foreign key from `manager_id` to `id`, with `ON DELETE NO ACTION`.                                                                             |
| Unique employee number and email, ignoring capitals (BR-05)          | Unique indexes, with values always stored in one case.                                                                                           |
| At least 15 years old (BR-07), names not blank                       | A trigger and check constraints.                                                                                                                 |
| No lost updates when two people edit at once                         | A `version` on every row, increased by the database on every change.                                                                             |
| Salary not negative (BR-06)                                          | A check constraint and a decimal type with 2 places.                                                                                             |
| No reporting loops (BR-02)                                           | A database trigger walks up the management chain on every manager change, and takes a short lock so two clashing changes can't both get through. |

### 8.3 Indexes

Indexes make sorting, filtering and tree lookups fast. We index `manager_id`, `last_name` with `first_name`, and `role`, plus the unique indexes above.

## 9. Hosting and deployment

The hosting design follows ADR 0004. Exact sizes and the region are confirmed during deployment.

### 9.1 Deployment diagram

What runs where in production, and how the pieces connect.

```mermaid
flowchart TB
    subgraph device["User's device"]
        browser["<b>Web browser</b><br/>Runs the React app"]
    end

    grav["<b>Gravatar</b><br/>gravatar.com"]

    subgraph aws["AWS region (Cape Town, af-south-1, or Ireland, eu-west-1)"]
        amplify["<b>AWS Amplify Hosting</b><br/>Static web app files<br/>HTTPS, served from a CDN"]
        cf["<b>Amazon CloudFront</b><br/>HTTPS address for the API"]
        ecr["<b>Amazon ECR</b><br/>API container images"]
        sm["<b>AWS Secrets Manager</b><br/>Database passwords"]
        logs["<b>Amazon CloudWatch</b><br/>Logs and health alarms"]

        subgraph vpc["VPC (private network)"]
            subgraph pub["Public subnets"]
                alb["<b>Application Load Balancer</b><br/>Health check: /api/health"]
                subgraph ecs["ECS Fargate service"]
                    task["<b>API container</b><br/>Node.js 22, NestJS<br/>port 3000"]
                end
            end
            subgraph priv["Private subnets, no internet access"]
                rds[("<b>Amazon RDS</b><br/>PostgreSQL 16<br/>port 5432")]
            end
        end
    end

    browser -->|"HTTPS 443: page and assets"| amplify
    browser -->|"HTTPS 443: /api"| cf
    browser -->|"HTTPS 443: picture by email hash"| grav
    cf -->|"HTTP 80"| alb
    alb -->|"HTTP 3000"| task
    task -->|"TLS 5432, app user only"| rds
    sm -.->|"secrets at start-up"| task
    ecr -.->|"image pulled at start-up"| task
    task -.->|"logs"| logs
```

| Node            | What it holds                                     | Why it's set up this way                                                                             |
| --------------- | ------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| Amplify Hosting | The built web app: HTML, JavaScript, CSS, fonts   | Static files over HTTPS, cached close to users, rebuilt from GitHub on every merge.                  |
| CloudFront      | Nothing, it forwards API calls                    | Gives the API an HTTPS address without buying a domain. Without HTTPS, the web app couldn't call it. |
| Load balancer   | Nothing, it routes                                | Checks `/api/health` and replaces a container that stops answering.                                  |
| ECS Fargate     | The API container                                 | Runs the same image as local Docker and CI, with no servers to patch.                                |
| RDS             | The employees database                            | Managed backups and patches. In private subnets, so only the API's security group can reach it.      |
| Secrets Manager | Database passwords for the app and migrator users | Secrets never sit in git, images or environment files.                                               |
| CloudWatch      | API logs and alarms                               | Logs carry request IDs, never personal data (NFR-05).                                                |

Other points:

- There is no NAT gateway. It is the most expensive part of a typical small AWS setup, and nothing in the private subnets needs the internet.
- The API connects to the database with the `hh_app` user, which can only read and write rows. Migrations use the separate `hh_migrator` user (ADR 0010).
- `TRUST_PROXY` is 2 (CloudFront and the load balancer), so rate limits see each visitor's real address (ADR 0013).
- The Cape Town region keeps employee data in South Africa. If it isn't enabled on the account, Ireland is used instead.

### 9.2 Delivery pipeline

How a change gets from a developer's machine to production.

```mermaid
flowchart LR
    dev(["Developer"]) -->|"push a branch"| gh["GitHub"]
    gh -->|"pull request"| ci

    subgraph ci["GitHub Actions: CI"]
        direction TB
        verify["<b>verify</b><br/>Format, lint, types,<br/>unit tests, build"]
        dbjob["<b>database</b><br/>PostgreSQL service, migrations,<br/>integration and end-to-end tests"]
    end

    ci -->|"both green, merge to main"| main["main branch"]
    main -->|"build and push image"| ecr["Amazon ECR"]
    ecr -->|"run migrations, then roll out"| ecs["ECS Fargate"]
    main -->|"build web app"| amp["Amplify Hosting"]
    iac["AWS setup written as code"] -.->|"creates and updates"| aws["AWS resources"]
```

- Nothing reaches `main` unless both CI jobs pass.
- The database job builds a fresh PostgreSQL from the same setup scripts used locally and on AWS, so all three environments match.
- New API containers only receive traffic once they pass the health check, so a broken release never replaces a working one.
- A separate Docs workflow builds the documentation site on every pull request, in strict mode, and publishes it to GitHub Pages from `main` (ADR 0015).

### 9.3 Environments

| Environment | Web app                    | API                           | Database                                                          | Used for                    |
| ----------- | -------------------------- | ----------------------------- | ----------------------------------------------------------------- | --------------------------- |
| Local       | Vite dev server, port 5173 | Node.js, port 3000            | PostgreSQL 16 in Docker: `hierarchy_hub` and `hierarchy_hub_test` | Building and testing        |
| CI          | Built, not served          | Booted inside the test runner | PostgreSQL 16 service container: `hierarchy_hub_test` only        | Checking every pull request |
| Production  | Amplify Hosting            | ECS Fargate                   | Amazon RDS                                                        | The live app                |

## 10. Design patterns

| Pattern                | Where                                | Why                                                                        |
| ---------------------- | ------------------------------------ | -------------------------------------------------------------------------- |
| Layered architecture   | API: controller, service, repository | Each layer has one job, so it is easier to test and change.                |
| Modular monolith       | NestJS modules                       | One app to deploy, but split into clear feature modules.                   |
| Dependency injection   | NestJS                               | Classes get what they need from the framework, so tests can swap in fakes. |
| Repository             | `EmployeesRepository`                | Keeps database code in one place, away from business rules.                |
| DTO and mapper         | API responses                        | The API's response shape does not change when the database changes.        |
| Shared kernel          | `packages/shared`                    | One set of types and validation rules for both web app and API.            |
| Optimistic concurrency | `version` column, ETag and If-Match  | A second save made from an old copy is refused instead of overwriting.     |
| Contract testing       | `packages/shared/src/testing`        | The same examples run against the mock API and the real API.               |
| Adapter                | Gravatar helper, API client          | Wraps outside services in small, typed functions.                          |
| Unit of work           | Delete with reassignment             | Several database changes succeed or fail together.                         |
| Infrastructure as code | AWS CDK                              | The cloud setup can be rebuilt from code at any time.                      |

The Gang of Four patterns used inside the code (Singleton, Factory, Builder, Adapter, Facade, Chain of Responsibility, Template Method, Strategy, Observer and Mediator) are listed with their locations in the [technical document, section 4.2](../technical/TECHNICAL.md#42-gang-of-four-patterns).

## 11. Cross-cutting concerns

| Concern       | Approach                                                                                                                                                                                                                                                                                                                                   |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Validation    | Zod rules in the shared package are used by the web forms and again by the API.                                                                                                                                                                                                                                                            |
| Errors        | The API always returns errors in the same JSON shape. The web app shows them next to the right field or at the top of the page.                                                                                                                                                                                                            |
| Configuration | Settings come from environment variables and are checked when the API starts. Each app has a `.env.example` file.                                                                                                                                                                                                                          |
| Logging       | The API logs to the console. On AWS these logs go to CloudWatch. Personal data is not logged.                                                                                                                                                                                                                                              |
| Security      | HTTPS everywhere, private database, secrets in Secrets Manager, Dependabot. Two database users, the API's can only read and write rows (ADR 0010). The API adds security headers, CORS limited to the web app, rate limits, a 16 KB request limit, strict input checks, version checks on every change and request IDs in logs (ADR 0013). |
| Caching       | Browser cache (TanStack Query), HTTP ETags with 304 responses, and database indexes. No Redis yet (ADR 0011).                                                                                                                                                                                                                              |
| Testing       | Unit tests (Jest for the API, Vitest for the web app and shared package). API tests against a real PostgreSQL database in CI. A browser smoke test with Playwright.                                                                                                                                                                        |
| CI/CD         | GitHub Actions checks formatting, linting, types, tests and builds on every pull request. Merges to `main` deploy automatically.                                                                                                                                                                                                           |

## 12. Risks

| Risk                                                                   | What we do about it                                                                                 |
| ---------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| Two people change managers at the same moment and create a loop.       | Solved: the database trigger takes a lock, so manager changes are checked one at a time (ADR 0010). |
| A very large org chart is slow to draw.                                | Solved: the Orbit and Levels views only draw one person's surroundings (ADR 0014).                  |
| No login in the first version, so anyone with the URL can change data. | Acceptable for the assessment. Login is planned as an extra (FR-17).                                |
| The Cape Town region is not enabled on the AWS account.                | Use Ireland (`eu-west-1`) instead.                                                                  |
| AWS free tier rules change.                                            | Use the smallest sizes and remove everything after the assessment.                                  |

## 13. Repository layout

```text
hierarchyHub/
├── apps/
│   ├── api/              NestJS API, Prisma schema, migrations and tests
│   └── web/              React web app and its tests
├── packages/
│   ├── shared/           Shared types, validation rules and contract examples
│   ├── tsconfig/         Shared TypeScript settings
│   └── eslint-config/    Shared lint rules
├── docs/                 This documentation
├── .github/              CI workflow and templates
├── docker-compose.yml    Local PostgreSQL, set up the same way as on AWS
└── Taskfile.yml          Short commands for setup, development and checks
```

The AWS infrastructure code is added with the deployment (ADR 0004).
