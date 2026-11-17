# Contributing

How code gets from an idea to `main`. The short version: **branch → small commits → pull request →
green CI → review → merge**. Nobody pushes to `main` directly.

## Branches

| Prefix        | Use for                              | Example                        |
| ------------- | ------------------------------------ | ------------------------------ |
| `feature/NN-` | New functionality, numbered in order | `feature/11-site-visits`       |
| `fix/`        | Bug fixes                            | `fix/whatsapp-duplicate-reply` |
| `chore/`      | Tooling, dependencies, CI            | `chore/upgrade-prisma`         |
| `docs/`       | Documentation only                   | `docs/go-live-checklist`       |

Branch from the latest `main` (or from the branch you depend on — see stacked PRs below). Keep a
branch to one topic; if it grows past ~600 changed lines, split it.

## Commits

[Conventional Commits](https://www.conventionalcommits.org/): `type(scope): summary`, in the
imperative, under ~72 characters.

```
feat(whatsapp): send AI replies through the Cloud API
fix(leads): keep the buyer's name when the AI updates the lead
test(api): cover the 24-hour WhatsApp reply window
docs: explain how to go live on WhatsApp
chore(deps): bump next to 15.5
```

Types: `feat`, `fix`, `test`, `docs`, `refactor`, `perf`, `chore`, `ci`. Use the body to explain
_why_. Breaking changes: add `!` after the type and a `BREAKING CHANGE:` line.

## Pull requests

1. Push the branch and open a PR. The template asks what changed, why, and how it was tested.
2. **CI must be green**: format, lint, typecheck, unit tests, API end-to-end tests against
   PostgreSQL, production build and Playwright browser tests (`.github/workflows/ci.yml`).
3. Review the diff. Database migrations and anything touching auth, tenants, tokens or webhooks get
   an extra careful read.
4. Merge, then delete the branch.

### Stacked PRs

When a feature needs an unmerged one, branch from it and open the PR **against that branch**
(`feature/11-…` → `feature/10-…`). Each PR then shows only its own changes. Merge from the bottom of
the stack upwards; GitHub retargets the next PR to `main` automatically when its base branch is
merged and deleted.

**Merge with "Create a merge commit" or "Rebase and merge" for stacked PRs** — squashing rewrites
the commits the next PR is built on and causes conflicts.

## Before you push

```bash
pnpm format:check && pnpm lint && pnpm typecheck
pnpm test                       # needs PostgreSQL (docker compose up -d)
pnpm --filter @rea/web test:e2e # when the UI changed
```

## Database changes

Change `prisma/schema.prisma`, then `pnpm db:migrate` to generate a migration. Commit the migration
folder with the schema change. Never edit a migration that is already on `main`; add a new one.

## Secrets

Never commit `.env`, tokens, keys or real buyer data. New settings go in `.env.example` with a
safe placeholder, in `apps/api/src/config/env.validation.ts`, and in the README.
