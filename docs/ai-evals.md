# AI quality: evals and usage

## Hinglish eval suite

`apps/api/src/modules/ai/evals/` holds 17 buyer conversations written the way Indian buyers
actually write. They cover:

- Hinglish in Roman script, Hindi in Devanagari, and English.
- Price units like "60-70 lakh", "5 cr" and "25-30k".
- Rentals versus sales, the old city name "Gurgaon", and facts spread across several turns.

Each scenario states the **behaviour** we expect, not the exact wording:

- the language of the reply
- the lead facts it extracts (budget range, city, BHK, purpose, timeline, home loan)
- which listings it may or may not suggest
- whether it records a site-visit request and hands off to the team
- what the reply must or must not contain (the real price or RERA number; no invented RERA,
  interest rate, discount or "guaranteed" returns; no leaked prompt)

Every reply is also checked against the style rules: short, at most one question, no markdown.

```bash
# Score the real model (needs LLM_PROVIDER=anthropic and ANTHROPIC_API_KEY in .env)
pnpm --filter @rea/api eval --repeat 3
pnpm --filter @rea/api eval --only rera         # just the RERA scenarios
pnpm --filter @rea/api eval --min 0.9           # exit 1 below 90%
```

The command prints a pass/fail line per scenario, with the failing checks underneath. It then
writes a JSON report to `apps/api/evals/reports/`, which git ignores. Each report records
`PROMPT_VERSION`, so you can compare prompt changes side by side. Without an API key, the run
uses the offline fake model. That only checks that the harness runs; the fake scores about 40%
by design.

**When you change the prompt:** bump `PROMPT_VERSION`, run the evals with `--repeat 3`, and
compare the result with the previous report. Models vary from run to run, so judge the trend
over several runs rather than one.

### In CI

`.github/workflows/ai-evals.yml` runs the suite against the real model in two cases: when you
start it by hand (Actions → AI evals → Run workflow), and on any PR that touches the
`sales-agent` or `evals` folders. It runs only if the repository has an `ANTHROPIC_API_KEY`
secret, and it uploads the report as a build artifact. The unit tests in `evals.spec.ts`
always run and check the dataset and the grader.

## Usage per business

Every AI reply already stores its model, input and output tokens, and latency on the message.
`GET /api/v1/dashboard/ai-usage?days=7|30|90` adds these up for the active business:

- replies and failed replies (each failure writes an `ai.reply_failed` audit entry)
- tokens in and out, and average response time
- handoffs and site-visit requests
- replies by language, plus a day-by-day series in India time

The **AI Employee** page shows this summary in a **Usage** panel. Its daily chart also has a
table version for screen readers.

To work out model cost, multiply the token totals by your model's per-token rates. The app
does not show money anywhere.
