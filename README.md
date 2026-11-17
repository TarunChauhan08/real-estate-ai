# AI Real Estate Sales Employee

A multi-tenant SaaS platform that gives Indian real estate brokers, agencies, builders and developers an **AI sales employee** — one that talks to buyers in Hindi, English and Hinglish, qualifies them, recommends verified inventory and books site visits.

> **Never miss a property enquiry. Turn more enquiries into qualified buyers and site visits.**

## Status: Phase 1 — Foundation

| Implemented                                                       | Placeholder (clearly labelled in the UI)                  |
| ----------------------------------------------------------------- | --------------------------------------------------------- |
| Business registration, login, refresh-token rotation, logout      | AI employee (chat, voice, WhatsApp, calls)                |
| Multi-tenant isolation, memberships, multiple businesses per user | Leads, conversations, properties, site visits, follow-ups |
| Role-based access (Owner, Admin, Manager, Sales agent, Viewer)    | Analytics, integrations                                   |
| Onboarding, business profile, preferences                         | Email delivery of invitations                             |
| Team management: invitations, role changes, disabling members     | Password reset, profile editing, 2FA                      |
| Audit log, dashboard overview with real data                      |                                                           |

No AI functionality exists yet, and the UI says so.

## Technology

**Web** Next.js 15 · React 19 · TypeScript · Tailwind CSS 4 · Radix/shadcn-style components · React Hook Form + Zod · TanStack Query
**API** NestJS 11 (modular monolith) · REST · Swagger
**Data** PostgreSQL 16 · Prisma 7
**Auth** JWT access tokens · rotating HttpOnly refresh cookies · Argon2id
**Quality** Jest · Supertest · Playwright · axe-core · ESLint · Prettier
**Infra** pnpm workspaces · Docker Compose

## Project structure

```
apps/api            NestJS API (auth, tenants, memberships, invitations, roles, audit, dashboard, health)
apps/web            Next.js app (public site + dashboard) and Playwright tests
packages/shared-types   enums, API types and the role/permission matrix shared by both apps
packages/eslint-config  shared lint rules
packages/typescript-config  shared tsconfig bases
prisma/             schema.prisma and migrations
docs/               architecture, database, API and setup guides
```

## Quick start

```bash
cp .env.example .env          # set POSTGRES_PASSWORD (also in DATABASE_URL) and JWT_ACCESS_SECRET
pnpm install
docker compose up -d          # PostgreSQL 16 (dev + test databases)
pnpm db:deploy                # apply migrations
pnpm db:seed                  # optional demo data
pnpm dev                      # API http://localhost:4000/api/v1 · web http://localhost:3000
```

Full instructions and troubleshooting: [docs/setup-guide.md](docs/setup-guide.md).

## Environment variables

All are listed with safe placeholders in [`.env.example`](.env.example). The API validates them at start-up and refuses to run with missing or unsafe values (e.g. non-secure cookies or a placeholder secret in production).

| Variable                                                                | Purpose                                                         |
| ----------------------------------------------------------------------- | --------------------------------------------------------------- |
| `DATABASE_URL`                                                          | PostgreSQL connection string                                    |
| `POSTGRES_USER` / `POSTGRES_PASSWORD` / `POSTGRES_DB` / `POSTGRES_PORT` | Docker Compose database                                         |
| `TEST_DATABASE_URL`                                                     | Optional; database for API e2e tests (name must contain `test`) |
| `API_PORT`, `CORS_ORIGINS`, `WEB_APP_URL`, `TRUST_PROXY_HOPS`           | API server and CORS                                             |
| `JWT_ACCESS_SECRET`, `JWT_ACCESS_TTL_SECONDS`, `REFRESH_TOKEN_TTL_DAYS` | Tokens                                                          |
| `COOKIE_SECURE`, `COOKIE_DOMAIN`                                        | Refresh cookie (secure must be `true` in production)            |
| `RATE_LIMIT_TTL_SECONDS`, `RATE_LIMIT_MAX`, `AUTH_RATE_LIMIT_MAX`       | Rate limiting                                                   |
| `INVITATION_TTL_HOURS`, `INVITATION_DELIVERY`                           | Invitations (`dev_link` is development-only)                    |
| `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_DEMO_REQUEST_EMAIL`                 | Web app                                                         |

## Commands

| Command                                              | What it does                            |
| ---------------------------------------------------- | --------------------------------------- |
| `pnpm dev`                                           | Run API and web in watch mode           |
| `pnpm build`                                         | Production builds of all packages       |
| `pnpm lint` · `pnpm typecheck` · `pnpm format:check` | Static checks                           |
| `pnpm test`                                          | API unit + e2e tests (needs PostgreSQL) |
| `pnpm --filter @rea/web test:e2e`                    | Playwright browser tests                |
| `pnpm db:migrate`                                    | Create/apply a migration in development |
| `pnpm db:deploy`                                     | Apply pending migrations                |
| `pnpm db:seed` · `pnpm db:reset` · `pnpm db:studio`  | Seed, reset, browse data                |
| `pnpm db:test:prepare`                               | Migrate the test database               |
| `docker compose up -d`                               | Start PostgreSQL                        |
| `docker compose --profile app up -d --build`         | Run the whole stack in containers       |

## Documentation

- [Architecture](docs/architecture.md) — modules, request pipeline, auth flow, tenant isolation, permission matrix, extension points
- [Database design](docs/database-design.md) — ER diagram, tables, constraints, RLS plan
- [API design](docs/api-design.md) — conventions, error codes, every endpoint
- [Setup guide](docs/setup-guide.md) — local development, tests, Docker, troubleshooting
