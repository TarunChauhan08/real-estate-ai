# AI Real Estate Sales Employee

[![CI](https://github.com/TarunChauhan08/real-estate-ai/actions/workflows/ci.yml/badge.svg)](https://github.com/TarunChauhan08/real-estate-ai/actions/workflows/ci.yml)

A multi-tenant SaaS platform that gives Indian real estate brokers, agencies, builders and developers an **AI sales employee** — one that talks to buyers in Hindi, English and Hinglish, qualifies them, recommends verified inventory and books site visits.

> **Never miss a property enquiry. Turn more enquiries into qualified buyers and site visits.**

## Status: Phase 4 — site visits and account security

| Implemented                                                                  | Not yet (clearly labelled in the UI)          |
| ---------------------------------------------------------------------------- | --------------------------------------------- |
| Premium public site with solution pages, guides and SEO                      | WhatsApp template messages (24 h+ follow-ups) |
| Registration, login, refresh-token rotation, multi-tenant isolation, roles   | Voice calls, voice-note transcription         |
| Password reset, email verification, password change, invitation emails       | Follow-ups, analytics                         |
| Onboarding, business profile, team invitations, audit log                    | Profile editing, two-factor sign-in           |
| Property inventory: list, search, filter, add, edit, archive                 | Meta Embedded Signup (one-click connect)      |
| Lead pipeline: list, filter, add, edit, stage rules, assignment              |                                               |
| **AI sales employee** (Claude or offline fake provider)                      |                                               |
| **WhatsApp Business (Meta Cloud API)**: buyers message, the AI replies       |                                               |
| WhatsApp inbox: live updates, delivery ticks, team replies, 24-hour window   |                                               |
| **Site visits**: AI takes requests, team confirms, buyer told and reminded   |                                               |
| AI fills in the lead (budget, city, BHK…), scores it, suggests real listings |                                               |
| Human handoff (discounts, legal, complaints) and one-click AI on/off         |                                               |

Everything runs without any accounts: `LLM_PROVIDER=fake` gives offline AI replies and
`WHATSAPP_PROVIDER=fake` gives a WhatsApp demo mode with a buyer simulator in **Integrations**.
For real replies set `LLM_PROVIDER=anthropic`; to go live on WhatsApp follow
[docs/setup-guide.md → Going live on WhatsApp](docs/setup-guide.md#going-live-on-whatsapp).

## Technology

**Web** Next.js 15 · React 19 · TypeScript · Tailwind CSS 4 · Radix/shadcn-style components · React Hook Form + Zod · TanStack Query
**API** NestJS 11 (modular monolith) · REST · Swagger
**Data** PostgreSQL 16 · Prisma 7
**Auth** JWT access tokens · rotating HttpOnly refresh cookies · Argon2id
**Quality** Jest · Supertest · Playwright · axe-core · ESLint · Prettier
**Infra** pnpm workspaces · Docker Compose

## Project structure

```
apps/api            NestJS API (auth, tenants, memberships, invitations, roles, audit, dashboard,
                    properties, leads, conversations, ai, whatsapp, whatsapp-webhook, health)
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
| `MAIL_PROVIDER`, `RESEND_API_KEY`, `MAIL_FROM`                          | Email (`fake` prints to the log; `resend` in production)        |
| `LLM_PROVIDER`, `ANTHROPIC_API_KEY`, `ANTHROPIC_MODEL`                  | AI employee (`fake` works offline)                              |
| `DATA_ENCRYPTION_KEY`                                                   | Encrypts stored secrets such as WhatsApp tokens (production)    |
| `WHATSAPP_PROVIDER`, `WHATSAPP_APP_SECRET`, `WHATSAPP_VERIFY_TOKEN`     | WhatsApp (`fake` = demo mode; `cloud` = Meta Cloud API)         |
| `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_DEMO_REQUEST_EMAIL`                 | Web app                                                         |
| `NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION`          | Public site address for SEO; Search Console verification        |

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
- [Design system](docs/design-system.md) — navy & gold palette, typography, photography and the psychology behind them
- [SEO and launch checklist](docs/seo.md)
- [Contributing](CONTRIBUTING.md) — branches, commit messages, pull requests, CI
- Decisions: [properties & leads](docs/decisions/0001-properties-and-leads.md) · [AI sales employee](docs/decisions/0002-ai-sales-employee.md) · [WhatsApp channel](docs/decisions/0003-whatsapp-channel.md) · [site visits](docs/decisions/0004-site-visits.md)
