# Operations runbook

What to set up before real businesses depend on the product, and what to do when something
breaks. Keep this file next to the code so it changes with it.

## Health checks

| Endpoint                   | Use it for                                        | Healthy                           |
| -------------------------- | ------------------------------------------------- | --------------------------------- |
| `GET /api/v1/health`       | **Liveness**: restart the container if this fails | `200 {status: "ok"}`              |
| `GET /api/v1/health/ready` | **Readiness**: send traffic only when this passes | `200 {status: "ready"}`, else 503 |

Point an uptime monitor (UptimeRobot, Better Stack, or Sentry Uptime) at `/health/ready`
every minute, and alert after two failures in a row.

## Error tracking (Sentry, optional)

1. Create a Node.js project in Sentry and copy its DSN.
2. Set `SENTRY_DSN` and `SENTRY_ENVIRONMENT` (e.g. `production`) for the API.
3. Restart. The log says `Error reporting: Sentry`.

What gets sent:

- Only unexpected server errors (5xx), uncaught exceptions and unhandled rejections.
- Each event has a request ID (to match the API logs), the HTTP method and the route pattern.

What never leaves the server:

- Request bodies (buyer messages), cookies, auth headers, query strings and user details.
- Phone numbers and emails inside error messages, which are masked.
- Automatic HTTP/database instrumentation is off, so no URLs or queries are recorded.

See `apps/api/src/observability/error-reporting.ts`. `SENTRY_TRACES_SAMPLE_RATE` stays `0`
unless you need performance traces.

## Backups

The database is the only stateful part. Everything else can be redeployed from git.

**Managed Postgres (recommended):** turn on daily automated backups **and** point-in-time
recovery (PITR) with at least 7 days of retention. Neon, Supabase, AWS RDS, DigitalOcean and
Google Cloud SQL all offer this. Pick a region in India (e.g. Mumbai) for data residency.

**Self-hosted Postgres:** run a nightly logical backup and keep 14 days. Store it in a
different provider or region from the database.

```bash
# nightly, e.g. from cron at 02:30 IST
pg_dump --format=custom --no-owner "$DATABASE_URL" > "rea-$(date +%F).dump"
# upload to object storage (S3, R2, B2…) with server-side encryption, then delete local copies
```

**Restore drill: do it before launch, then every quarter.** A backup you have never restored
is a guess.

```bash
createdb rea_restore_test
pg_restore --no-owner --dbname=rea_restore_test rea-YYYY-MM-DD.dump
psql rea_restore_test -c 'select count(*) from tenants; select count(*) from messages;'
```

Write down how long the restore took. That is your real recovery time.

Keep secrets out of backups' reach as well. `DATA_ENCRYPTION_KEY` encrypts WhatsApp access
tokens at rest, so a database restore without that key cannot reconnect WhatsApp. Store the
key in your secrets manager, never next to the dumps.

## Business data requests

Owners serve themselves from **Settings → Your data**:

- **Export**: `GET /tenants/current/data-export` returns one JSON file with the profile, team,
  listings, leads, conversations, site visits and the latest 5,000 audit entries. Passwords and
  tokens are never included.
- **Delete**: `POST /tenants/current/deletion` (needs the password and the business name
  typed exactly).
  - WhatsApp is disconnected at once and pending invitations are withdrawn.
  - Every member sees a banner, and the owner can cancel (`DELETE /tenants/current/deletion`).
  - After `TENANT_DELETION_GRACE_DAYS` (default 30), the purge job deletes every row of the
    business. It also deletes the user accounts of members who belong to no other business.
  - The job runs every `TENANT_PURGE_INTERVAL_MS`, and several API instances can safely run it
    at once.

Deleted data leaves backups only as those backups expire. The Privacy Policy says so.

## When something breaks

1. **Is it up?** Check `/health/ready`. A 503 means the database is unreachable: check the
   provider's status page and the connection limit.
2. **What failed?** Search the API logs for the `requestId` that the user saw in the error, or
   open the Sentry issue, which carries the same `request_id` tag.
3. **AI not replying?** Look at AI Employee → Usage → Reliability. Every failed reply is logged
   as `ai.reply_failed` with its reason (timeout, rate limit, invalid key). The buyer's message
   is always saved, so nothing is lost.
4. **WhatsApp silent?** Check Integrations for the last message received, then Meta's
   _WhatsApp Manager → Insights_. An expired access token is the usual cause.
5. **Afterwards**, write three lines in the PR or issue: what happened, why, and what stops it
   happening again.

## Before launch checklist

- [ ] `NODE_ENV=production`, strong `JWT_ACCESS_SECRET` and `DATA_ENCRYPTION_KEY` from a
      secrets manager
- [ ] `MAIL_PROVIDER=resend` with a verified sending domain (SPF and DKIM)
- [ ] Database backups and PITR on, and one restore drill done
- [ ] Uptime monitor on `/health/ready`
- [ ] `SENTRY_DSN` set (optional, but strongly recommended)
- [ ] `pnpm db:migrate` run against production
- [ ] AI evals run against the production model: `pnpm --filter @rea/api eval --repeat 3`
