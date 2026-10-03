# Database

PostgreSQL 16, used through Prisma. The design and its reasons are in [ADR 0010](../../../docs/adr/0010-database-design.md).

## Day to day

| Command            | What it does                                                                         |
| ------------------ | ------------------------------------------------------------------------------------ |
| `task db:up`       | Start the local database in Docker. The first start creates the users and databases. |
| `task db:migrate`  | Apply migrations to the local and test databases                                     |
| `task integration` | Run the integration tests against the test database                                  |
| `task db:psql`     | Open a SQL prompt as the app user                                                    |
| `task db:studio`   | Browse the data in Prisma Studio                                                     |
| `task db:reset`    | Delete everything and start again                                                    |

You need Docker Desktop running, and `apps/api/.env` (copied from `.env.example`).

## Making a change to the table

1. Edit `schema.prisma`.
2. Run `task db:new-migration -- describe_the_change`. Prisma writes the SQL into `migrations/`.
3. If the change needs a rule Prisma can't describe (a check or trigger), add it to the bottom of that new `migration.sql`.
4. Run `task db:migrate`, then `task db:check` to confirm `schema.prisma` and the database match.
5. Add integration tests for any new rule.

Never edit a migration that has already been merged to `main`. Make a new one instead.

## Files

| Path                   | What it is                                                       |
| ---------------------- | ---------------------------------------------------------------- |
| `schema.prisma`        | The table as Prisma sees it                                      |
| `migrations/`          | Every change to the database, applied in order                   |
| `setup/roles.sql`      | Creates the two database users. Used by local Docker, CI and AWS |
| `setup/database.sql`   | Locks down a database and sets each user's permissions           |
| `setup/docker-init.sh` | Runs the two scripts above the first time local Docker starts    |

## The two users

| User          | Can do                                          | Used by                                |
| ------------- | ----------------------------------------------- | -------------------------------------- |
| `hh_migrator` | Owns the tables and can change their structure  | `task db:migrate` and deployments only |
| `hh_app`      | Read, add, change and delete rows, nothing else | The API                                |

The local passwords in `docker-compose.yml` and `.env.example` are for your machine only.

## How the API connects

The API talks to the database through one shared connection pool ([ADR 0012](../../../docs/adr/0012-prisma-client-with-pg-pool.md)). It's set up from these environment variables, which are checked when the API starts:

| Variable               | Local                 | Production                                |
| ---------------------- | --------------------- | ----------------------------------------- |
| `DATABASE_URL`         | `hh_app` on localhost | `hh_app` on RDS. Never add `sslmode` here |
| `DATABASE_SSL`         | `disable`             | `verify-full` (required)                  |
| `DATABASE_SSL_CA_FILE` | not needed            | The AWS RDS certificate bundle            |
| `DATABASE_POOL_MAX`    | 10                    | 10 per API instance                       |

If the database can't be reached, the API refuses to start and says so, without printing the password.

### Errors

Every database rule has a friendly message. For example, a reporting loop becomes a 400 with "This person reports to the employee you're editing...", and a duplicate email becomes a 409. The mapping lives in `src/database/database-errors.ts`, and integration tests check every rule against the real database.

Unexpected errors return a generic 500. The logs record only the route, status and error code, never the error's message, because PostgreSQL error messages can contain a whole row of personal data.

### Health checks

| Endpoint                | Checks                                                 | Used by                                                                            |
| ----------------------- | ------------------------------------------------------ | ---------------------------------------------------------------------------------- |
| `GET /api/health`       | The API process is up                                  | The AWS load balancer, so a short database blip doesn't restart healthy containers |
| `GET /api/health/ready` | The API and the database (503 if the database is down) | Monitoring                                                                         |
