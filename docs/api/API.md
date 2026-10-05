# API Contract

This is the agreement between the web app and the API. It is written before the code so both sides can be built against it. If the API changes, update this file in the same pull request.

## Basics

- Base URL: `/api`. Locally this is `http://localhost:3000/api`.
- Requests and responses are JSON.
- Dates use ISO 8601. Birth dates are `YYYY-MM-DD`.
- Every endpoint needs you to be signed in, except the health checks and the sign in forms (`/auth/signup` and `/auth/login`). Without a session you get **401**. See [Signing in](#signing-in).

## Endpoints

| Method | Path                     | What it does                                                                               | Success code |
| ------ | ------------------------ | ------------------------------------------------------------------------------------------ | ------------ |
| GET    | `/health`                | Checks the API process is up (used by the load balancer).                                  | 200          |
| GET    | `/health/ready`          | Checks the API can reach the database. Returns 503 with `"database": "down"` if not.       | 200          |
| GET    | `/employees`             | Lists employees one page at a time, with sorting and filters.                              | 200          |
| GET    | `/employees/hierarchy`   | Returns every employee in one flat list, used to build the org chart.                      | 200          |
| GET    | `/employees/{id}`        | Returns one employee.                                                                      | 200          |
| POST   | `/employees`             | Adds an employee.                                                                          | 201          |
| PATCH  | `/employees/{id}`        | Changes some or all of an employee's details, including their manager.                     | 200          |
| DELETE | `/employees/{id}`        | Deletes an employee. Their direct reports move to the deleted employee's manager.          | 204          |
| POST   | `/auth/signup`           | Asks for an account. Always the same answer, whether or not the email is taken.            | 202          |
| POST   | `/auth/login`            | Signs in and sets the session cookie.                                                      | 200          |
| POST   | `/auth/logout`           | Ends the session and clears the cookie.                                                    | 204          |
| GET    | `/auth/me`               | Who is signed in.                                                                          | 200          |
| GET    | `/accounts`              | Admins: accounts waiting for approval, and the accounts of people below you.               | 200          |
| POST   | `/accounts/{id}/approve` | Admins: links a waiting account to an employee below you, so they can sign in.             | 200          |
| POST   | `/accounts/{id}/reject`  | Admins: removes a request for an account.                                                  | 204          |
| PATCH  | `/accounts/{id}`         | Admins: `{ "isAdmin": true }` or `{ "status": "disabled" }`, for an account in your reach. | 200          |

## Who can do what

Everything depends on where you sit in the organisation (ADR 0017). Your reach is everyone below you.

| Request                | Allowed when                                                                                                     |
| ---------------------- | ---------------------------------------------------------------------------------------------------------------- |
| Reading anything       | You're signed in. Salaries and birth dates of people outside your reach (and not you) come back as `null`.       |
| `PATCH` yourself       | Only `firstName`, `lastName` and `email`. Anything else gets **403**, with the fields listed in `errors`.        |
| `PATCH` someone else   | They're in your reach. A new `managerId` must be you or someone in your reach. `null` only if you're at the top. |
| `POST` an employee     | You're an admin, and their manager is you or someone in your reach.                                              |
| `DELETE` an employee   | You're an admin, and they're in your reach.                                                                      |
| `PATCH /accounts/{id}` | You're an admin, and the account's employee is in your reach.                                                    |

Anything else gets **403**. Filtering or sorting by `salary` or `birthDate` only includes you and your reach, so the filters can't reveal anyone else's.

Reads are sent with `Cache-Control: private, no-cache` and `Vary: Cookie`, because what you see depends on who you are.

## Signing in

`POST /auth/login` with `{ "email": "...", "password": "..." }`. On success the response is who you are, and the API sets an `hh_session` cookie the browser sends from then on. Scripts can't read it (`httpOnly`), other websites can't send it (`SameSite=Lax`), and in production it only travels over HTTPS (ADR 0016).

```json
{
  "id": "3f0c…",
  "name": "Johan van der Merwe",
  "email": "johan.vandermerwe@example.com",
  "isAdmin": false,
  "employeeId": "00000000-0000-4000-8000-000000000005"
}
```

| Code | When                                                                                   |
| ---- | -------------------------------------------------------------------------------------- |
| 401  | The email or password is wrong. The same answer either way.                            |
| 403  | The password is right, but the account is still waiting for approval or is turned off. |
| 429  | Five wrong passwords in a row. The account is locked for 15 minutes.                   |

`POST /auth/signup` takes `{ "name", "email", "password" }`. Passwords are 12 to 128 characters and can't contain the name part of your email. The answer is always **202** with the same message, so it can't be used to find out who has an account.

`POST /accounts/{id}/approve` takes `{ "employeeId": "..." }`. It answers **403** if that employee isn't below you, **409** if they already have an account or someone else has dealt with the request, and **404** if the employee no longer exists.

Any request that changes data has to come from the web app's own address. Changes sent by another website get **403**.

## List parameters

Used with `GET /employees`. All are optional.

| Parameter                 | Type   | Description                                                                                                                                                                                                             |
| ------------------------- | ------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `search`                  | text   | Matches first name, surname, email, employee number or role. Not case sensitive.                                                                                                                                        |
| `role`                    | text   | Exact role. Not case sensitive.                                                                                                                                                                                         |
| `managerId`               | UUID   | Only the direct reports of this manager.                                                                                                                                                                                |
| `salaryMin`, `salaryMax`  | number | Salary range, including both ends.                                                                                                                                                                                      |
| `bornAfter`, `bornBefore` | date   | Birth date range, including both ends.                                                                                                                                                                                  |
| `sortBy`                  | text   | One of `employeeNumber`, `firstName`, `lastName`, `email`, `birthDate`, `salary`, `role`, `managerName`, `createdAt`. `managerName` sorts by the manager's surname, with top-level people first. Default is `lastName`. |
| `sortOrder`               | text   | `asc` or `desc`. Default is `asc`.                                                                                                                                                                                      |
| `page`                    | number | Page number, starting at 1. Default is 1.                                                                                                                                                                               |
| `pageSize`                | number | Results per page, up to 500. Default is 25.                                                                                                                                                                             |

Example: `GET /api/employees?role=engineer&sortBy=salary&sortOrder=desc&page=1`

Rules for the list:

- Text searches and text sorts ignore capitals. `%` and `_` in a search are plain characters, not wildcards.
- People with the same value are always ordered by surname, then first name, so paging is stable and nobody appears on two pages.
- Unknown parameters are refused with a 400, so typos get noticed.
- A page past the end returns no items, with the correct `total`.

List response:

```json
{
  "items": [],
  "total": 0,
  "page": 1,
  "pageSize": 25
}
```

## Employee

```json
{
  "id": "6b0c0d0e-5f1a-4c8e-9a3b-2d7e1f0c4a11",
  "employeeNumber": "EMP-0001",
  "firstName": "Thandi",
  "lastName": "Nkosi",
  "email": "thandi.nkosi@example.com",
  "birthDate": "1985-04-12",
  "salary": 125000,
  "role": "Chief Executive Officer",
  "managerId": null,
  "version": 1,
  "createdAt": "2026-10-02T08:00:00.000Z",
  "updatedAt": "2026-10-02T08:00:00.000Z"
}
```

`version` goes up by one every time the employee changes. When adding an employee, send every field except `id`, `version`, `createdAt` and `updatedAt`. `managerId` can be left out or set to `null`. When editing, send only the fields that change.

## Changing an employee safely

Every employee has a `version`, also sent as the `ETag` header (for example `"v3"`). To change or delete someone, send back the version you loaded:

```http
PATCH /api/employees/6b0c0d0e-5f1a-4c8e-9a3b-2d7e1f0c4a11
If-Match: "v3"
Content-Type: application/json

{ "role": "Head of Engineering" }
```

- If nobody else changed them since, the change is saved and the response carries the new version (`"v4"`).
- If someone else saved first, you get **412** and nothing is overwritten.
- Without `If-Match` you get **428**. `If-Match: *` (any version) and weak tags like `W/"v3"` are refused with **400**, because they would let a change skip the check.
- Only send the fields that change. Unknown fields (including `id` and `version`) are refused.

## Errors

Errors always have this shape:

```json
{
  "statusCode": 400,
  "message": "Validation failed",
  "errors": {
    "email": ["Enter a valid email address"]
  }
}
```

| Code | When                                                                                                      |
| ---- | --------------------------------------------------------------------------------------------------------- |
| 400  | Input is not valid, the employee would be their own manager, or the change would create a reporting loop. |
| 404  | The employee or manager does not exist.                                                                   |
| 409  | Another employee already has that employee number or email.                                               |
| 503  | The database cannot be reached (health check only).                                                       |

## Caching

| Header                               | Meaning                                                                                    |
| ------------------------------------ | ------------------------------------------------------------------------------------------ |
| `Cache-Control: no-cache` on reads   | The browser may keep a copy but must check with the API every time, so data is never stale |
| `Cache-Control: no-store` on changes | Never stored                                                                               |
| `ETag`                               | A fingerprint of the response. For one employee it's their version, eg `"v3"`              |
| `If-None-Match`                      | Send the ETag back. If nothing changed, the API answers `304 Not Modified` with no body    |

See [ADR 0011](../adr/0011-caching.md).

## Security

- Every response has an `X-Request-Id`. Include it when reporting a problem.
- Only the web app's own address may call the API from a browser (CORS).
- Requests are rate limited per IP address: 300 reads and 60 changes per minute. See [ADR 0013](../adr/0013-api-security-layer.md).
