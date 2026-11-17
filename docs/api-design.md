# API design

Base URL: `http://localhost:4000/api/v1` · Interactive docs (non-production): `/api/v1/docs` (Swagger UI).

## Conventions

**Success**

```json
{ "data": { ... } }
{ "data": [ ... ], "meta": { "page": 1, "pageSize": 20, "total": 42, "totalPages": 3 } }
```

**Error** — always this shape, with a stable `code` clients can branch on:

```json
{
  "error": {
    "code": "VALIDATION_FAILED",
    "message": "Request validation failed",
    "details": [{ "field": "password", "message": "Password must contain a number" }],
    "requestId": "3f0c…"
  }
}
```

- Every response carries `x-request-id` (an incoming well-formed one is reused). Server logs use the same ID; 5xx responses never include internals.
- **Authentication:** `Authorization: Bearer <accessToken>`. Refresh/logout use the `rea_refresh` HttpOnly cookie (send requests with `credentials: 'include'`).
- **Validation:** unknown body fields are rejected (`400`), not ignored. Strings are trimmed; emails lower-cased.
- **Pagination:** `?page=1&pageSize=20` (max 100) on list endpoints.
- **Rate limits:** global per-IP limit (`RATE_LIMIT_MAX` per `RATE_LIMIT_TTL_SECONDS`); credential endpoints also have a strict limit (`AUTH_RATE_LIMIT_MAX`). Exceeding returns `429 RATE_LIMITED`.

| Status | Typical codes                                                                                     |
| ------ | ------------------------------------------------------------------------------------------------- |
| 400    | `VALIDATION_FAILED`                                                                               |
| 401    | `UNAUTHENTICATED`, `INVALID_CREDENTIALS`, `REFRESH_RACE` (retry refresh once)                     |
| 403    | `FORBIDDEN`, `ACCOUNT_DISABLED`, `ROLE_NOT_ASSIGNABLE`, `INSUFFICIENT_ROLE`, `CANNOT_MODIFY_SELF` |
| 404    | `NOT_FOUND`, `INVITATION_INVALID`                                                                 |
| 409    | `EMAIL_TAKEN`, `ALREADY_MEMBER`, `INVITATION_USED`, `INVITATION_NOT_PENDING`, `LAST_OWNER`        |
| 410    | `INVITATION_EXPIRED`, `INVITATION_REVOKED`                                                        |
| 429    | `RATE_LIMITED`                                                                                    |

## Endpoints

Legend: 🌐 public · 🔒 authenticated · _permission_ required in the active tenant.

### Health

| Method | Path            | Access | Description                                   |
| ------ | --------------- | ------ | --------------------------------------------- |
| GET    | `/health`       | 🌐     | Liveness — process is up                      |
| GET    | `/health/ready` | 🌐     | Readiness — database reachable (`503` if not) |

### Auth

| Method | Path                  | Access          | Description                                                                                                                                                                  |
| ------ | --------------------- | --------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| POST   | `/auth/register`      | 🌐 strict limit | `{ name, email, password, businessName, businessType, acceptTerms: true }` → creates user, tenant (`PENDING`), profile, settings, OWNER membership, session. `201` + session |
| POST   | `/auth/login`         | 🌐 strict limit | `{ email, password }` → session                                                                                                                                              |
| POST   | `/auth/refresh`       | 🌐 cookie       | Rotates the refresh cookie → session                                                                                                                                         |
| POST   | `/auth/logout`        | 🌐 cookie       | Revokes the session family, clears cookie → `204`                                                                                                                            |
| GET    | `/auth/me`            | 🔒              | User, active tenant (with role) and all usable memberships                                                                                                                   |
| POST   | `/auth/switch-tenant` | 🔒              | `{ tenantId }` → session in that tenant (must be an active member)                                                                                                           |

Session response:

```json
{
  "data": {
    "accessToken": "eyJ…",
    "expiresIn": 900,
    "user": { "id": "…", "name": "Asha Verma", "email": "asha@noidahomes.in" },
    "activeTenant": {
      "id": "…",
      "name": "Noida Homes",
      "slug": "noida-homes-3fa2c1",
      "status": "ACTIVE",
      "membershipId": "…",
      "role": "OWNER"
    }
  }
}
```

### Current tenant

| Method | Path                          | Permission        | Description                                                                                                                       |
| ------ | ----------------------------- | ----------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| GET    | `/tenants/current`            | `tenant:read`     | Business (id, name, slug, status)                                                                                                 |
| PATCH  | `/tenants/current`            | `tenant:update`   | `{ name }`                                                                                                                        |
| GET    | `/tenants/current/profile`    | `tenant:read`     | Business type, phone, website, city, state, country                                                                               |
| PATCH  | `/tenants/current/profile`    | `tenant:update`   | Any subset; empty string clears optional fields; bare domains become `https://`                                                   |
| GET    | `/tenants/current/settings`   | `settings:read`   | timezone, locale, currency, preferredLanguage                                                                                     |
| PATCH  | `/tenants/current/settings`   | `settings:update` | IANA timezone; locale `en-IN`/`hi-IN`; currency `INR`; language `en`/`hi`/`hinglish`                                              |
| POST   | `/tenants/current/onboarding` | `tenant:update`   | `{ businessName, businessType, phone?, website?, city, state, timezone, preferredLanguage }` → saves all and sets status `ACTIVE` |

### Team

| Method | Path                                      | Permission       | Description                                                           |
| ------ | ----------------------------------------- | ---------------- | --------------------------------------------------------------------- |
| GET    | `/tenants/current/members`                | `members:read`   | `?role=&status=&q=&page=&pageSize=`                                   |
| PATCH  | `/tenants/current/members/:id/role`       | `members:manage` | `{ role }` — hierarchy, self and last-owner rules apply               |
| PATCH  | `/tenants/current/members/:id/status`     | `members:manage` | `{ status: "ACTIVE" \| "SUSPENDED" }`                                 |
| POST   | `/tenants/current/invitations`            | `members:invite` | `{ email, role }` → `{ invitation, delivery }`                        |
| GET    | `/tenants/current/invitations`            | `members:invite` | `?status=PENDING\|ACCEPTED\|EXPIRED\|REVOKED`                         |
| POST   | `/tenants/current/invitations/:id/revoke` | `members:invite` | Withdraw a pending invitation                                         |
| POST   | `/invitations/preview`                    | 🌐 strict limit  | `{ token }` → `{ tenantName, email, role, expiresAt, accountExists }` |
| POST   | `/invitations/accept`                     | 🌐 strict limit  | `{ token, password, name? }` → session in the invited tenant          |

`:id` values are membership/invitation IDs **scoped to the caller's tenant** — IDs from another tenant return `404`.

**Invitation delivery.** No email provider is configured in Phase 1, so `delivery.status` is always `"not_sent"` with a reason. When `INVITATION_DELIVERY=dev_link` (rejected by env validation in production), `delivery.devAcceptUrl` contains the accept link — e.g. `http://localhost:3000/accept-invitation#token=…`. The token is in the URL fragment so it is never sent to a server or written to access logs. New invitees choose a name and password; existing users confirm their current password.

### Dashboard and audit

| Method | Path                  | Permission       | Description                                                                                                                      |
| ------ | --------------------- | ---------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| GET    | `/dashboard/overview` | `dashboard:read` | Real team counts, setup progress; metrics for unbuilt modules are `{ "status": "not_available", "reason": "…" }` — never numbers |
| GET    | `/audit-logs`         | `audit:read`     | Newest first; `?action=&entityType=&actorId=&from=&to=&page=&pageSize=`                                                          |

Audit actions: `auth.registered`, `auth.login`, `auth.login_failed`, `auth.logout`, `auth.refresh_reuse_detected`, `auth.tenant_switched`, `tenant.created`, `tenant.updated`, `tenant.onboarding_completed`, `business_profile.updated`, `tenant_settings.updated`, `invitation.created`, `invitation.revoked`, `invitation.accepted`, `member.role_changed`, `member.status_changed`. Metadata never contains passwords, tokens or hashes (enforced by a scrubber and a unit test).

### Properties (`properties:read` / `properties:write`)

| Method | Path              | Notes                                                                                                                                |
| ------ | ----------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| GET    | `/properties`     | Filters: `q, status, propertyType, listingType, city, bedrooms, minPrice, maxPrice, sort`. ARCHIVED hidden unless `status=ARCHIVED`. |
| GET    | `/properties/:id` | 404 for unknown IDs and for other businesses' IDs.                                                                                   |
| POST   | `/properties`     | `price` is whole rupees. `possessionDate` is `YYYY-MM-DD`.                                                                           |
| PATCH  | `/properties/:id` | `null` clears optional fields; `null` on required fields is ignored. Set `status: ARCHIVED` instead of deleting.                     |

### Leads (`leads:read` / `leads:write` / `leads:assign`)

| Method | Path                  | Notes                                                                                                          |
| ------ | --------------------- | -------------------------------------------------------------------------------------------------------------- |
| GET    | `/leads`              | Filters: `q` (name, email, phone digits), `status, temperature, source, assignedToId, sort`.                   |
| GET    | `/leads/:id`          |                                                                                                                |
| POST   | `/leads`              | Phone normalised to E.164; duplicate phone in the same business → 409 `LEAD_PHONE_EXISTS`.                     |
| PATCH  | `/leads/:id`          | Details only.                                                                                                  |
| PATCH  | `/leads/:id/status`   | WON is terminal; LOST can only go back to NEW; otherwise 409 `LEAD_INVALID_TRANSITION`.                        |
| PATCH  | `/leads/:id/assignee` | Body `{ membershipId \| null }`; needs `leads:assign`; assignee must be an ACTIVE member of the same business. |

Roles: OWNER/ADMIN everything; MANAGER everything (read, write, assign); SALES_AGENT reads properties, reads/writes leads (cannot assign); VIEWER read-only.

### Conversations (`conversations:read` / `conversations:write`)

| Method | Path                          | Notes                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| ------ | ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| GET    | `/conversations`              | Filters: `leadId, status, channel`. Most recent activity first.                                                                                                                                                                                                                                                                                                                                                                                               |
| GET    | `/conversations/:id`          | Includes the last 200 messages, oldest first.                                                                                                                                                                                                                                                                                                                                                                                                                 |
| POST   | `/conversations`              | Start a **test chat**: `{ leadId }` or `{ phone, name? }` (lead created or reused). Also needs `leads:write`.                                                                                                                                                                                                                                                                                                                                                 |
| POST   | `/conversations/:id/messages` | `{ content, as?: 'BUYER' \| 'AGENT' }`. A buyer message in a test chat returns `{ buyerMessage, aiMessage, handoffRequested, aiError }`. If the AI fails, the buyer message is still saved and `aiError` explains. Closed conversation → 409 `CONVERSATION_CLOSED`. On WhatsApp only `AGENT` is allowed: the reply is sent to the buyer and returned with its `deliveryStatus`; more than 24 h after the buyer's last message → 409 `WHATSAPP_WINDOW_CLOSED`. |
| PATCH  | `/conversations/:id`          | `{ aiEnabled?, status? }` — take over from the AI, or close/re-open.                                                                                                                                                                                                                                                                                                                                                                                          |

SALES_AGENT and above can chat; VIEWER can only read.

Messages carry `deliveryStatus` (`PENDING → SENT → DELIVERED → READ`, or `FAILED` with `deliveryError`)
for outgoing WhatsApp messages; conversations carry `replyWindowEndsAt` on WhatsApp.

### WhatsApp channel

| Method | Path                          | Permission            | Notes                                                                                                                                                                                              |
| ------ | ----------------------------- | --------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| GET    | `/channels/whatsapp`          | `settings:read`       | `{ provider, account, simulatorEnabled }`. The access token is never returned.                                                                                                                     |
| PUT    | `/channels/whatsapp`          | `channels:manage`     | `{ phoneNumberId, wabaId?, displayPhoneNumber, accessToken }`. Token checked with Meta first (400 `WHATSAPP_VERIFICATION_FAILED`). Number used by another business → 409 `WHATSAPP_NUMBER_IN_USE`. |
| DELETE | `/channels/whatsapp`          | `channels:manage`     | Disconnect. Conversations and messages are kept.                                                                                                                                                   |
| POST   | `/channels/whatsapp/simulate` | `conversations:write` | Demo mode only (fake provider, never production): `{ from, name?, text }` → `{ conversationId }`. Same pipeline as a real webhook.                                                                 |
| GET    | `/webhooks/whatsapp`          | public                | Meta's subscription handshake: echoes `hub.challenge` when `hub.verify_token` matches.                                                                                                             |
| POST   | `/webhooks/whatsapp`          | public, signed        | Meta's events. `X-Hub-Signature-256` must be an HMAC of the raw body with `WHATSAPP_APP_SECRET` (else 401). Answers 200 at once; processing continues in the background.                           |

`channels:manage` belongs to OWNER and ADMIN only.
