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

## Sending real email

In development `MAIL_PROVIDER=fake` prints every email — with its link — in the API log, so you can
click verification and password-reset links without an email account. For real email:

1. Create an account at [resend.com](https://resend.com) and add your domain under **Domains**.
   Add the DNS records it shows (SPF, DKIM) and wait for "Verified".
2. Create an API key with _sending access_.
3. In `.env`: `MAIL_PROVIDER=resend`, `RESEND_API_KEY=re_…`,
   `MAIL_FROM="Your Brand <noreply@yourdomain.in>"` (the domain you verified) and optionally
   `MAIL_REPLY_TO=support@yourdomain.in`. Restart the API.
4. Invite a teammate or use **Forgot password?** on the sign-in page to check delivery.

Production refuses to start with `MAIL_PROVIDER=fake`.

## Going live on WhatsApp

Out of the box `WHATSAPP_PROVIDER=fake`: you can connect any number in **Integrations**, and the
**Try it like a buyer** simulator sends pretend WhatsApp messages through the real pipeline. Nothing
reaches a real phone. To go live:

1. **Meta app.** In [Meta for Developers](https://developers.facebook.com/apps) create a _Business_ app
   and add the **WhatsApp** product. Note the **App secret** (App settings → Basic).
2. **Server settings.** In `.env` set `WHATSAPP_PROVIDER=cloud`, `WHATSAPP_APP_SECRET`,
   a long random `WHATSAPP_VERIFY_TOKEN`, and `DATA_ENCRYPTION_KEY` (`openssl rand -base64 32`).
   Restart the API.
3. **Public HTTPS URL.** Meta must reach the API. Locally, use a tunnel such as
   `ngrok http 4000` or `cloudflared tunnel --url http://localhost:4000`.
4. **Webhook.** WhatsApp → Configuration → Webhook: callback URL
   `https://<your-api-host>/api/v1/webhooks/whatsapp`, verify token = `WHATSAPP_VERIFY_TOKEN`.
   Click _Verify and save_, then subscribe to the **messages** field.
5. **Number and token.** Add the business's number under WhatsApp → API Setup. In Business Manager,
   create a **System User** with `whatsapp_business_messaging` and `whatsapp_business_management`,
   assign the WhatsApp account to it, and generate a **permanent** token.
6. **Connect.** In the dashboard, **Integrations → WhatsApp Business**: paste the Phone number ID,
   WhatsApp Business Account ID, number and token. The API checks the token with Meta before saving
   it (encrypted).
7. Message the number from your own phone. The AI replies within a few seconds and the chat appears
   under **Conversations**.

WhatsApp rules the product follows: free-form replies are only allowed within 24 hours of the
buyer's last message (the inbox shows the remaining window and blocks replies after it). Starting a
conversation, or following up after 24 hours, needs Meta-approved _template_ messages — not built
yet.

## Troubleshooting

| Symptom                                            | Fix                                                                                                                            |
| -------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| API exits with `Invalid environment configuration` | The message lists the variable names to fix in `.env`                                                                          |
| `P1001: Can't reach database server`               | `docker compose up -d`, and check `DATABASE_URL` host/port/password                                                            |
| Prisma engine download fails during `pnpm install` | A network/proxy is blocking `binaries.prisma.sh`; allow it, or set `PRISMA_SCHEMA_ENGINE_BINARY` to a local engine             |
| Signed out on every page load                      | `CORS_ORIGINS` must contain the exact web origin (e.g. `http://localhost:3000`); `COOKIE_SECURE` must be `false` on plain http |
| Meta says the callback URL could not be verified   | `WHATSAPP_VERIFY_TOKEN` must match exactly, and the URL must be public HTTPS ending in `/api/v1/webhooks/whatsapp`             |
| Buyer messages arrive but the AI does not reply    | Check the conversation is not paused ("AI paused"), and the API log for `WhatsApp delivery failed` with Meta's reason          |
| "WhatsApp access token is invalid or expired"      | Generate a permanent System User token (temporary tokens expire after 24 hours) and reconnect in Integrations                  |
| Web pages load without styles after building       | `pnpm build` overwrote the dev output — stop `pnpm dev`, delete `apps/web/.next`, restart                                      |
