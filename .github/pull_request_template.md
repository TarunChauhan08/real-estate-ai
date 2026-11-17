## What and why

<!-- One or two sentences: what this PR changes and the problem it solves. -->

## How it was tested

- [ ] `pnpm format:check && pnpm lint && pnpm typecheck`
- [ ] `pnpm test` (unit + API e2e)
- [ ] `pnpm --filter @rea/web test:e2e` if the UI changed
- [ ] Checked the change in the browser

## Checklist

- [ ] New database changes have a migration in `prisma/migrations/`
- [ ] New environment variables are in `.env.example`, `env.validation.ts` and the README
- [ ] No secrets, tokens or real customer data in code, tests or logs
- [ ] Docs updated (`docs/`) if behaviour or the API changed
