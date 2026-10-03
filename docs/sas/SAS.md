# Software Architecture Specification (SAS)

|         |                                                                                                 |
| ------- | ----------------------------------------------------------------------------------------------- |
| Project | Hierarchy Hub                                                                                   |
| Version | 0.1 (draft)                                                                                     |
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

| Part           | Job                                                                                        | Built with                                                            |
| -------------- | ------------------------------------------------------------------------------------------ | --------------------------------------------------------------------- |
| Web app        | Screens: org chart, table, forms. Checks input before sending it. Shows Gravatar pictures. | React, Vite, TanStack Query, React Router, React Flow, TanStack Table |
| CloudFront     | Gives the API a secure HTTPS address without buying a domain name.                         | Amazon CloudFront                                                     |
| API            | Business rules, input checks, saving and reading data.                                     | NestJS, Prisma, Zod                                                   |
| Database       | Stores employees and enforces key rules.                                                   | PostgreSQL 16 on Amazon RDS                                           |
| Shared package | Types and validation rules used by both the web app and the API.                           | TypeScript, Zod. Not deployed on its own.                             |

## 5. Inside the API

The API is split into modules. Each module has three layers, and each layer only talks to the one below it.

```mermaid
flowchart TB
    subgraph api["API"]
        subgraph emp["Employees module"]
            ctrl["<b>Controller</b><br/>Receives HTTP requests"]
            pipe["<b>Validation pipe</b><br/>Checks input with shared rules"]
            svc["<b>Service</b><br/>Business rules"]
            repo["<b>Repository</b><br/>Database queries"]
        end
        subgraph health["Health module"]
            hc["<b>Health controller</b><br/>GET /api/health"]
        end
        prisma["<b>Prisma service</b><br/>Database connection"]
    end

    shared["Shared package<br/>Validation rules and types"]
    db[("PostgreSQL")]

    ctrl --> pipe
    pipe -.-> shared
    ctrl --> svc
    svc --> repo
    repo --> prisma
    hc --> prisma
    prisma --> db
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
        layout["<b>Layout</b><br/>Top bar and navigation"]
        subgraph pages["Pages"]
            chart["Org chart page"]
            table["Employees table page"]
            details["Employee details and form"]
        end
        avatar["<b>Avatar</b><br/>Gravatar picture"]
        query["<b>TanStack Query</b><br/>Loading, caching and refreshing data"]
        client["<b>API client</b><br/>Typed calls to the API"]
    end
    shared["Shared package"]

    layout --> pages
    chart --> avatar
    table --> avatar
    pages --> query
    query --> client
    details -.->|"form validation"| shared
    chart -.->|"builds the tree"| shared
```

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
    W->>W: Lay out and draw the chart
    loop For each person on screen
        W->>W: Hash the email address
        W->>G: Request picture by hash
        G-->>W: Picture, or a generated pattern
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
        datetime created_at
        datetime updated_at
    }
```

### 8.2 Rules enforced by the database

| Rule                                                                 | How                                                                                                                                              |
| -------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| Not their own manager (BR-01)                                        | A check constraint: `manager_id` must not equal `id`.                                                                                            |
| Manager must exist, and can't be deleted while people report to them | A foreign key from `manager_id` to `id`, with `ON DELETE NO ACTION`.                                                                             |
| Unique employee number and email, ignoring capitals (BR-05)          | Unique indexes, with values always stored in one case.                                                                                           |
| Birth date in the past (BR-07), names not blank                      | A trigger and check constraints.                                                                                                                 |
| No lost updates when two people edit at once                         | A `version` on every row, increased by the database on every change.                                                                             |
| Salary not negative (BR-06)                                          | A check constraint and a decimal type with 2 places.                                                                                             |
| No reporting loops (BR-02)                                           | A database trigger walks up the management chain on every manager change, and takes a short lock so two clashing changes can't both get through. |

### 8.3 Indexes

Indexes make sorting, filtering and tree lookups fast. We index `manager_id`, `last_name` with `first_name`, and `role`, plus the unique indexes above.

## 9. Hosting

```mermaid
flowchart TB
    dev(["Developer"]) -->|"push"| gh["GitHub"]
    gh -->|"run checks"| ci["GitHub Actions"]
    gh -->|"build on merge to main"| amp
    ci -->|"deploy backend"| cfn["CloudFormation via AWS CDK"]

    subgraph aws["AWS, Cape Town region"]
        amp["Amplify Hosting<br/>Web app"]
        cdn["CloudFront"]
        subgraph vpc["Private network (VPC)"]
            subgraph public["Public subnets"]
                alb["Load balancer"]
                task["API container<br/>ECS Fargate"]
            end
            subgraph private["Private subnets"]
                rds[("PostgreSQL<br/>RDS")]
            end
        end
        sm["Secrets Manager"]
    end

    cfn --> cdn
    cfn --> alb
    cfn --> task
    cfn --> rds
    cfn --> sm
    cdn --> alb
    alb --> task
    task --> rds
    sm -.-> task
```

Key points:

- The web app is a set of static files served by Amplify over HTTPS.
- The API runs as a Docker container on ECS Fargate, so there are no servers to manage. The load balancer checks `/api/health` and restarts the container if it fails.
- CloudFront sits in front of the load balancer to give the API an HTTPS address. Without it, the HTTPS website could not call the API.
- The database is in private subnets with no internet access. Only the API container can connect to it.
- We do not use a NAT gateway. It is the most expensive part of a typical small AWS setup and we do not need it.
- The Cape Town region (`af-south-1`) keeps employee data in South Africa. If that region is not enabled on the account, we use Ireland (`eu-west-1`).
- Database changes (migrations) run automatically when the API container starts.

## 10. Design patterns

| Pattern                | Where                                | Why                                                                        |
| ---------------------- | ------------------------------------ | -------------------------------------------------------------------------- |
| Layered architecture   | API: controller, service, repository | Each layer has one job, so it is easier to test and change.                |
| Modular monolith       | NestJS modules                       | One app to deploy, but split into clear feature modules.                   |
| Dependency injection   | NestJS                               | Classes get what they need from the framework, so tests can swap in fakes. |
| Repository             | `EmployeesRepository`                | Keeps database code in one place, away from business rules.                |
| DTO and mapper         | API responses                        | The API's response shape does not change when the database changes.        |
| Shared kernel          | `packages/shared`                    | One set of types and validation rules for both web app and API.            |
| Composite              | Org chart tree                       | Every node in the tree is handled the same way, so drawing it is simple.   |
| Adapter                | Gravatar helper, API client          | Wraps outside services in small, typed functions.                          |
| Unit of work           | Delete with reassignment             | Several database changes succeed or fail together.                         |
| Infrastructure as code | AWS CDK                              | The cloud setup can be rebuilt from code at any time.                      |

## 11. Cross-cutting concerns

| Concern       | Approach                                                                                                                                                                                                                        |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Validation    | Zod rules in the shared package are used by the web forms and again by the API.                                                                                                                                                 |
| Errors        | The API always returns errors in the same JSON shape. The web app shows them next to the right field or at the top of the page.                                                                                                 |
| Configuration | Settings come from environment variables and are checked when the API starts. Each app has a `.env.example` file.                                                                                                               |
| Logging       | The API logs to the console. On AWS these logs go to CloudWatch. Personal data is not logged.                                                                                                                                   |
| Security      | HTTPS everywhere, private database, secrets in Secrets Manager, CORS limited to the web app's address, Dependabot for updates. Two database users: the API's user can only read and write rows, never change tables (ADR 0010). |
| Caching       | Browser cache (TanStack Query), HTTP ETags with 304 responses, and database indexes. No Redis yet (ADR 0011).                                                                                                                   |
| Testing       | Unit tests (Jest for the API, Vitest for the web app and shared package). API tests against a real PostgreSQL database in CI. A browser smoke test with Playwright.                                                             |
| CI/CD         | GitHub Actions checks formatting, linting, types, tests and builds on every pull request. Merges to `main` deploy automatically.                                                                                                |

## 12. Risks

| Risk                                                                   | What we do about it                                                                                 |
| ---------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| Two people change managers at the same moment and create a loop.       | Solved: the database trigger takes a lock, so manager changes are checked one at a time (ADR 0010). |
| A very large org chart is slow to draw.                                | Collapse teams below a certain level by default and only draw what is on screen.                    |
| No login in the first version, so anyone with the URL can change data. | Acceptable for the assessment. Login is planned as an extra (FR-17).                                |
| The Cape Town region is not enabled on the AWS account.                | Use Ireland (`eu-west-1`) instead.                                                                  |
| AWS free tier rules change.                                            | Use the smallest sizes and remove everything after the assessment.                                  |

## 13. Repository layout

```text
hierarchyHub/
├── apps/
│   ├── api/              NestJS API
│   └── web/              React web app
├── packages/
│   ├── shared/           Shared types and validation rules
│   ├── tsconfig/         Shared TypeScript settings
│   └── eslint-config/    Shared lint rules
├── infra/                AWS CDK code (added in a later part)
├── docs/                 This documentation
└── .github/              CI workflows and templates
```
