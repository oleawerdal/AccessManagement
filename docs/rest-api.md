# REST API (`/api/v1`)

A versioned, machine-to-machine REST API for managing **persons**, **systems**,
**roles** and **assignments** (role grants). It is separate from the internal
endpoints used by the web UI, so its response shapes are stable and decoupled
from UI changes.

All mutations are recorded in the audit log, attributed to the API key
(`api:<key name>`).

## Authentication

Authenticate with an API key as a bearer token:

```
Authorization: Bearer am_<prefix>_<secret>
```

Create and manage keys in the web UI under **Innstillinger → API-nøkler**
(ADMIN only). The full token is shown **once** at creation and stored only as a
SHA-256 hash — keep it safe; it cannot be retrieved again.

Each key has a role:

| Role      | Access                                         |
| --------- | ---------------------------------------------- |
| `ADMIN`   | Full CRUD on all resources                     |
| `AUDITOR` | Read-only (`GET`); mutations return `403`       |

Keys can be deactivated or given an expiry date; expired/deactivated keys are
rejected with `401`.

## Conventions

- Base path: `/api/v1`
- Request/response bodies are JSON. Dates are ISO 8601 strings.
- Validation errors return `400` with `{ "error": "Valideringsfeil", "issues": … }`.
- Auth errors return `401`; insufficient role returns `403`; missing resources
  return `404`; unique-constraint conflicts return `409`.

### List responses

`GET` collection endpoints are paginated and return an envelope:

```json
{
  "data": [ /* … items … */ ],
  "pagination": { "page": 1, "pageSize": 50, "total": 123, "totalPages": 3 }
}
```

Query params: `page` (default 1), `pageSize` (default 50, max 200).

## Resources

### Persons — `/api/v1/persons`

| Method   | Path                  | Description                          |
| -------- | --------------------- | ------------------------------------ |
| `GET`    | `/api/v1/persons`     | List. Filters: `active`, `q`         |
| `POST`   | `/api/v1/persons`     | Create                               |
| `GET`    | `/api/v1/persons/:id` | Fetch one                            |
| `PATCH`  | `/api/v1/persons/:id` | Update (partial)                     |
| `DELETE` | `/api/v1/persons/:id` | Delete                               |

Create/update fields: `firstName`, `lastName`, `email`, `employeeId`,
`department`, `jobTitle`, `employmentType` (`EMPLOYEE`|`CONSULTANT`|`EXTERNAL`|
`INTERN`), `startDate`, `endDate`, `active`, `notes`.

### Systems — `/api/v1/systems`

| Method   | Path                  | Description                  |
| -------- | --------------------- | ---------------------------- |
| `GET`    | `/api/v1/systems`     | List. Filters: `active`, `q` |
| `POST`   | `/api/v1/systems`     | Create                       |
| `GET`    | `/api/v1/systems/:id` | Fetch one                    |
| `PATCH`  | `/api/v1/systems/:id` | Update (partial)             |
| `DELETE` | `/api/v1/systems/:id` | Delete                       |

Fields: `name`, `description`, `category`, `ownerEmail`, `url`, `active`.

### Roles — `/api/v1/roles`

| Method   | Path                | Description                          |
| -------- | ------------------- | ------------------------------------ |
| `GET`    | `/api/v1/roles`     | List. Filters: `systemId`, `q`       |
| `POST`   | `/api/v1/roles`     | Create (requires `systemId`)         |
| `GET`    | `/api/v1/roles/:id` | Fetch one                            |
| `PATCH`  | `/api/v1/roles/:id` | Update (`name`, `description`, `riskLevel`) |
| `DELETE` | `/api/v1/roles/:id` | Delete                               |

Fields: `systemId` (create only), `name`, `description`, `riskLevel`
(`LOW`|`NORMAL`|`HIGH`|`CRITICAL`).

### Assignments — `/api/v1/assignments`

Direct role grants to a person.

| Method   | Path                              | Description                                        |
| -------- | --------------------------------- | -------------------------------------------------- |
| `GET`    | `/api/v1/assignments`             | List. Filters: `personId`, `roleId`, `systemId`, `status` (`ACTIVE`/`EXPIRED`/`REVOKED`) |
| `POST`   | `/api/v1/assignments`             | Grant a role directly (`personId`, `roleId`, `expiresAt?`, `notes?`) |
| `GET`    | `/api/v1/assignments/:id`         | Fetch one                                          |
| `PATCH`  | `/api/v1/assignments/:id`         | Renew/change expiry (`expiresAt`, `notes?`)        |
| `POST`   | `/api/v1/assignments/:id/revoke`  | Revoke (`reason` required)                          |
| `DELETE` | `/api/v1/assignments/:id`         | Hard-delete                                        |

Granting a role the person already holds directly (and that is still active)
returns `409`.

## Examples

```bash
TOKEN="am_xxxxxxxxxx_yyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyy"
BASE="https://your-host/api/v1"

# List active persons
curl -s -H "Authorization: Bearer $TOKEN" "$BASE/persons?active=true&pageSize=20"

# Create a system
curl -s -X POST -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"name":"Jira","category":"Utvikling"}' "$BASE/systems"

# Update a person
curl -s -X PATCH -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"department":"IT"}' "$BASE/persons/<id>"

# Grant a role to a person (expires in 90 days)
curl -s -X POST -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"personId":"<pid>","roleId":"<rid>","expiresAt":"2026-08-31T00:00:00.000Z"}' \
  "$BASE/assignments"

# Revoke an assignment
curl -s -X POST -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"reason":"Sluttet i stillingen"}' "$BASE/assignments/<id>/revoke"
```
