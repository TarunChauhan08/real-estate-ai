import { type LLMProvider } from '../llm/llm-provider';
import { PROMPT_VERSION } from '../sales-agent/prompt';
import { SalesAgentService } from '../sales-agent/sales-agent.service';
import { EVAL_BUSINESS, EVAL_INVENTORY, NEW_LEAD } from './fixtures';
import { type EvalCheck, gradeDecision } from './grader';
import { type EvalScenario } from './scenarios';

export interface EvalRun {
  passed: boolean;
  checks: EvalCheck[];
  reply: string | null;
  error?: string;
  latencyMs: number;
  inputTokens: number;
  outputTokens: number;
}

export interface EvalReport {
  promptVersion: string;
  provider: string;
  model: string | null;
  startedAt: string;
  repeat: number;
  scenarios: Array<{ id: string; description: string; runs: EvalRun[]; passRate: number }>;
  /** Share of all runs in which every check passed. */
  passRate: number;
  /** Share of all individual checks that passed. */
  checkPassRate: number;
  /** Failing check names with how often they failed, worst first. */
  failures: Array<{ check: string; count: number }>;
  totals: { inputTokens: number; outputTokens: number; averageLatencyMs: number };
}

/** Runs each scenario `repeat` times through the real agent code path and grades it. */
export async function runEvals(
  provider: LLMProvider,
  scenarios: EvalScenario[],
  options: {
    repeat?: number;
    concurrency?: number;
    onProgress?: (done: number, total: number) => void;
  } = {},
): Promise<EvalReport> {
  const repeat = Math.max(1, options.repeat ?? 1);
  const agent = new SalesAgentService(provider);
  const startedAt = new Date().toISOString();
  let model: string | null = null;
  const jobs = scenarios.flatMap((scenario) => Array.from({ length: repeat }, () => scenario));
  const results = new Map<string, EvalRun[]>();
  let done = 0;

  const runOne = async (scenario: EvalScenario): Promise<EvalRun> => {
    try {
      const result = await agent.respond({
        business: EVAL_BUSINESS,
        lead: NEW_LEAD,
        properties: EVAL_INVENTORY,
        history: scenario.history,
      });
      model = result.model;
      const checks = gradeDecision(result, scenario.expect);
      return {
        passed: checks.every((c) => c.passed),
        checks,
        reply: result.reply,
        latencyMs: result.latencyMs,
        inputTokens: result.usage.inputTokens,
        outputTokens: result.usage.outputTokens,
      };
    } catch (error) {
      return {
        passed: false,
        checks: [{ name: 'valid response', passed: false, detail: (error as Error).message }],
        reply: null,
        error: (error as Error).message,
        latencyMs: 0,
        inputTokens: 0,
        outputTokens: 0,
      };
    }
  };

  // A small worker pool keeps real-API runs quick without tripping rate limits.
  const queue = [...jobs];
  const workers = Array.from({ length: Math.max(1, options.concurrency ?? 3) }, async () => {
    for (let scenario = queue.shift(); scenario; scenario = queue.shift()) {
      const run = await runOne(scenario);
      results.set(scenario.id, [...(results.get(scenario.id) ?? []), run]);
      done += 1;
      options.onProgress?.(done, jobs.length);
    }
  });
  await Promise.all(workers);

  const allRuns = [...results.values()].flat();
  const allChecks = allRuns.flatMap((r) => r.checks);
  const failureCounts = new Map<string, number>();
  for (const c of allChecks.filter((c) => !c.passed))
    failureCounts.set(c.name, (failureCounts.get(c.name) ?? 0) + 1);
  const ratio = (n: number, d: number) => (d === 0 ? 0 : Math.round((n / d) * 1000) / 1000);
  const answered = allRuns.filter((r) => !r.error);

  return {
    promptVersion: PROMPT_VERSION,
    provider: provider.name,
    model,
    startedAt,
    repeat,
    scenarios: scenarios.map((s) => {
      const runs = results.get(s.id) ?? [];
      return {
        id: s.id,
        description: s.description,
        runs,
        passRate: ratio(runs.filter((r) => r.passed).length, runs.length),
      };
    }),
    passRate: ratio(allRuns.filter((r) => r.passed).length, allRuns.length),
    checkPassRate: ratio(allChecks.filter((c) => c.passed).length, allChecks.length),
    failures: [...failureCounts.entries()]
      .map(([check, count]) => ({ check, count }))
      .sort((a, b) => b.count - a.count),
    totals: {
      inputTokens: allRuns.reduce((n, r) => n + r.inputTokens, 0),
      outputTokens: allRuns.reduce((n, r) => n + r.outputTokens, 0),
      averageLatencyMs: answered.length
        ? Math.round(answered.reduce((n, r) => n + r.latencyMs, 0) / answered.length)
        : 0,
    },
  };
}
