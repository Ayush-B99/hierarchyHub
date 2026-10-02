# API Contract

This is the agreement between the web app and the API. It is written before the code so both sides can be built against it. If the API changes, update this file in the same pull request.

## Basics

- Base URL: `/api`. Locally this is `http://localhost:3000/api`.
- Requests and responses are JSON.
- Dates use ISO 8601. Birth dates are `YYYY-MM-DD`.
- There is no login in the first version.

## Endpoints

| Method | Path                   | What it does                                                                      | Success code |
| ------ | ---------------------- | --------------------------------------------------------------------------------- | ------------ |
| GET    | `/health`              | Checks the API and database are working.                                          | 200          |
| GET    | `/employees`           | Lists employees one page at a time, with sorting and filters.                     | 200          |
| GET    | `/employees/hierarchy` | Returns every employee in one flat list, used to build the org chart.             | 200          |
| GET    | `/employees/{id}`      | Returns one employee.                                                             | 200          |
| POST   | `/employees`           | Adds an employee.                                                                 | 201          |
| PATCH  | `/employees/{id}`      | Changes some or all of an employee's details, including their manager.            | 200          |
| DELETE | `/employees/{id}`      | Deletes an employee. Their direct reports move to the deleted employee's manager. | 204          |

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
  "createdAt": "2026-10-02T08:00:00.000Z",
  "updatedAt": "2026-10-02T08:00:00.000Z"
}
```

When adding an employee, send every field except `id`, `createdAt` and `updatedAt`. `managerId` can be left out or set to `null`. When editing, send only the fields that change.

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
