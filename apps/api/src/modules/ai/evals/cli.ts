/* eslint-disable no-console */
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { config as loadEnv } from 'dotenv';
import { AnthropicProvider } from '../llm/anthropic.provider';
import { FakeLLMProvider } from '../llm/fake.provider';
import { type LLMProvider } from '../llm/llm-provider';
import { runEvals } from './run-evals';
import { EVAL_SCENARIOS } from './scenarios';

/**
 * Scores the AI employee on the Hinglish eval set.
 *
 *   pnpm --filter @rea/api eval                  # uses LLM_PROVIDER / ANTHROPIC_* from .env
 *   pnpm --filter @rea/api eval --repeat 3       # run every scenario 3 times (models vary)
 *   pnpm --filter @rea/api eval --only rent      # scenarios whose id contains "rent"
 *   pnpm --filter @rea/api eval --min 0.9        # exit 1 below a 90% pass rate
 *
 * A JSON report is written to apps/api/evals/reports/ for comparing prompt versions.
 */
function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i > 0 ? process.argv[i + 1] : undefined;
}

function buildProvider(): LLMProvider {
  const root = path.resolve(__dirname, '../../../../../..');
  loadEnv({ path: path.join(root, 'apps/api/.env'), quiet: true });
  loadEnv({ path: path.join(root, '.env'), quiet: true });
  if (process.env.LLM_PROVIDER === 'anthropic' && process.env.ANTHROPIC_API_KEY) {
    return new AnthropicProvider({
      apiKey: process.env.ANTHROPIC_API_KEY,
      model: process.env.ANTHROPIC_MODEL ?? 'claude-sonnet-5-5',
      baseUrl: process.env.ANTHROPIC_BASE_URL ?? 'https://api.anthropic.com',
      timeoutMs: Number(process.env.LLM_TIMEOUT_MS ?? 30_000),
    });
  }
  console.warn(
    'Using the offline fake model. Set LLM_PROVIDER=anthropic and ANTHROPIC_API_KEY to score the real AI.\n',
  );
  return new FakeLLMProvider();
}

async function main() {
  const repeat = Number(arg('repeat') ?? 1);
  const min = arg('min') !== undefined ? Number(arg('min')) : undefined;
  const only = arg('only');
  const scenarios = only ? EVAL_SCENARIOS.filter((s) => s.id.includes(only)) : EVAL_SCENARIOS;
  if (scenarios.length === 0) throw new Error(`No scenario id contains "${only}"`);

  const provider = buildProvider();
  const report = await runEvals(provider, scenarios, {
    repeat,
    onProgress: (done, total) => process.stdout.write(`\r  ${done}/${total} runs`),
  });
  process.stdout.write('\n\n');

  for (const s of report.scenarios) {
    const mark = s.passRate === 1 ? '✓' : s.passRate === 0 ? '✗' : '~';
    console.log(
      `${mark} ${s.id.padEnd(28)} ${(s.passRate * 100).toFixed(0).padStart(3)}%  ${s.description}`,
    );
    for (const run of s.runs.filter((r) => !r.passed).slice(0, 1)) {
      for (const c of run.checks.filter((c) => !c.passed))
        console.log(`    – ${c.name}: ${(c.detail ?? '').slice(0, 140)}`);
    }
  }
  console.log(
    `\nPrompt ${report.promptVersion} · ${report.provider}${report.model ? ` (${report.model})` : ''}`,
  );
  console.log(
    `Scenarios passed: ${(report.passRate * 100).toFixed(1)}% · checks passed: ${(report.checkPassRate * 100).toFixed(1)}%`,
  );
  console.log(
    `Tokens: ${report.totals.inputTokens} in / ${report.totals.outputTokens} out · avg ${report.totals.averageLatencyMs} ms`,
  );

  const dir = path.resolve(__dirname, '../../../../evals/reports');
  mkdirSync(dir, { recursive: true });
  const file = path.join(dir, `${report.startedAt.replace(/[:.]/g, '-')}-${report.provider}.json`);
  writeFileSync(file, JSON.stringify(report, null, 2));
  console.log(`Report: ${path.relative(process.cwd(), file)}`);

  if (min !== undefined && report.passRate < min) {
    console.error(`\nBelow the required pass rate of ${(min * 100).toFixed(0)}%.`);
    process.exit(1);
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
