# Setup guide

## Prerequisites

| Tool           | Version         | Check                            |
| -------------- | --------------- | -------------------------------- |
| Node.js        | 22 LTS or newer | `node -v`                        |
| pnpm           | 10.x            | `corepack enable` then `pnpm -v` |
| Docker Desktop | any recent      | `docker compose version`         |
| Git            | any             | `git --version`                  |

On Windows, run the commands below in PowerShell or Git Bash from the repository folder.

## 1. Install and configure

```bash
git clone <your-repo-url> real-estate-ai
cd real-estate-ai
cp .env.example .env            # Windows PowerShell: Copy-Item .env.example .env
```

Edit `.env`:

- Set `POSTGRES_PASSWORD` and use the same password inside `DATABASE_URL`.
- Set `JWT_ACCESS_SECRET` to a random value:
  `node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"`

Then install dependencies (this also generates the Prisma client):

```bash
pnpm install
```

## 2. Start PostgreSQL

```bash
docker compose up -d
docker compose ps               # postgres should be "healthy"
```

The container also creates `realestate_test`, used only by the automated tests.

## 3. Create the schema

```bash
pnpm db:deploy                  # apply migrations to the dev database
pnpm db:seed                    # optional: two demo businesses (password printed)
```

## 4. Run the apps

```bash
pnpm dev                        # API on :4000, web on :3000
```

- Web: http://localhost:3000 → **Register your business**
- API docs: http://localhost:4000/api/v1/docs
- Health: http://localhost:4000/api/v1/health/ready

Seeded accounts (if you ran the seed): `owner@noidahomes.demo`, `admin@…`, `manager@…`, `agent@…`, `viewer@noidahomes.demo` and `owner@abcdevelopers.demo`, all with the development password printed by the seed.

## 5. Inviting team members locally

There is no email provider in Phase 1. With `INVITATION_DELIVERY=dev_link` (the default in `.env.example`), **Team → Invite member** shows a one-time link. Open it in a private window to accept as the invitee.

## Tests and checks

```bash
pnpm db:test:prepare            # migrate the test database (also runs automatically before e2e tests)
pnpm test                       # API unit + e2e tests (Jest + Supertest, real PostgreSQL)
pnpm --filter @rea/api test:unit
pnpm --filter @rea/api test:e2e

# Browser tests (Playwright). First time only:
pnpm --filter @rea/web exec playwright install chromium
pnpm --filter @rea/web test:e2e # starts the API and web app if they are not already running

pnpm lint                       # ESLint, all packages
pnpm typecheck                  # TypeScript, all packages
pnpm build                      # production builds
pnpm format:check               # Prettier
```

API e2e tests use `TEST_DATABASE_URL` (default `postgresql://realestate:realestate@localhost:5432/realestate_test`) and refuse to run against a database whose name does not contain `test`. If your Postgres password is not `realestate`, set `TEST_DATABASE_URL` accordingly.

> Do not run `pnpm build` while `pnpm dev` is running — both use `apps/web/.next`. Stop the dev server first, or delete `apps/web/.next` and restart it.

## Running everything in Docker

```bash
# .env must be production-safe for the API container: COOKIE_SECURE=true,
# a real JWT_ACCESS_SECRET, and INVITATION_DELIVERY=none.
docker compose --profile app run --rm migrate
docker compose --profile app up -d --build
```

`COOKIE_SECURE=true` requires HTTPS, so for local click-through testing prefer `pnpm dev`.

## Troubleshooting

| Symptom                                            | Fix                                                                                                                            |
| -------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| API exits with `Invalid environment configuration` | The message lists the variable names to fix in `.env`                                                                          |
| `P1001: Can't reach database server`               | `docker compose up -d`, and check `DATABASE_URL` host/port/password                                                            |
| Prisma engine download fails during `pnpm install` | A network/proxy is blocking `binaries.prisma.sh`; allow it, or set `PRISMA_SCHEMA_ENGINE_BINARY` to a local engine             |
| Signed out on every page load                      | `CORS_ORIGINS` must contain the exact web origin (e.g. `http://localhost:3000`); `COOKIE_SECURE` must be `false` on plain http |
| Web pages load without styles after building       | `pnpm build` overwrote the dev output — stop `pnpm dev`, delete `apps/web/.next`, restart                                      |
