import { FakeLLMProvider } from '../llm/fake.provider';
import { type LLMProvider } from '../llm/llm-provider';
import { type AgentDecision } from '../sales-agent/response';
import { EVAL_INVENTORY, L } from './fixtures';
import { gradeDecision } from './grader';
import { runEvals } from './run-evals';
import { EVAL_SCENARIOS } from './scenarios';

const decision = (overrides: Partial<AgentDecision> = {}): AgentDecision => ({
  reply: 'Aapke budget mein Sector 62 ka 2 BHK hai. Kya aap visit karna chahenge?',
  language: 'hinglish',
  leadUpdates: {},
  temperature: 'WARM',
  qualified: true,
  suggestedPropertyIds: [],
  siteVisitRequested: false,
  siteVisitPreference: null,
  handoff: { requested: false, reason: null },
  ...overrides,
});

describe('eval data', () => {
  it('has unique scenario ids that only reference listings in the inventory', () => {
    const ids = EVAL_SCENARIOS.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
    const known = new Set(EVAL_INVENTORY.map((p) => p.id));
    for (const s of EVAL_SCENARIOS) {
      for (const id of [...(s.expect.suggestAnyOf ?? []), ...(s.expect.suggestNoneOf ?? [])])
        expect(known.has(id)).toBe(true);
      expect(s.history.at(-1)?.role).toBe('user');
    }
  });

  it('covers Hinglish, Hindi and English, and the safety rules', () => {
    const languages = new Set(EVAL_SCENARIOS.flatMap((s) => s.expect.language ?? []));
    expect([...languages].sort()).toEqual(['en', 'hi', 'hinglish']);
    expect(EVAL_SCENARIOS.length).toBeGreaterThanOrEqual(15);
    expect(EVAL_SCENARIOS.some((s) => s.id === 'prompt-injection')).toBe(true);
  });
});

describe('gradeDecision', () => {
  it('passes a reply that meets every expectation', () => {
    const checks = gradeDecision(
      decision({
        leadUpdates: { budgetMax: 7_000_000, preferredCity: 'Noida', preferredBedrooms: [2] },
        suggestedPropertyIds: [L.twoBhk62],
      }),
      {
        language: ['hinglish'],
        lead: {
          budgetMax: [7_000_000, 7_000_000],
          preferredCity: /noida/i,
          preferredBedrooms: [2],
        },
        suggestAnyOf: [L.twoBhk62],
        suggestNoneOf: [L.villaGurugram],
      },
    );
    expect(checks.filter((c) => !c.passed)).toEqual([]);
  });

  it('names each failure with what actually happened', () => {
    const checks = gradeDecision(
      decision({
        language: 'en',
        leadUpdates: { budgetMax: 700_000 },
        suggestedPropertyIds: [L.villaGurugram],
        reply: 'Returns are guaranteed! Which city? Which budget?',
      }),
      {
        language: ['hinglish'],
        lead: { budgetMax: [7_000_000, 7_000_000] },
        suggestNoneOf: [L.villaGurugram],
        handoff: true,
      },
    );
    const failed = Object.fromEntries(
      checks.filter((c) => !c.passed).map((c) => [c.name, c.detail]),
    );
    expect(failed).toMatchObject({
      language: 'answered in en',
      'lead.budgetMax': '700000',
      'suggests nothing unsuitable': expect.stringContaining(L.villaGurugram),
      'handoff flag': 'false',
    });
    expect(failed).toHaveProperty(['at most one question']);
    expect(failed).toHaveProperty(['no guarantees']);
  });

  it('flags markdown and over-long replies', () => {
    const checks = gradeDecision(decision({ reply: `**Great!**\n- one\n${'x'.repeat(700)}` }), {});
    const failed = checks.filter((c) => !c.passed).map((c) => c.name);
    expect(failed).toEqual(expect.arrayContaining(['no markdown', 'reply is short (≤ 600 chars)']));
  });
});

describe('runEvals', () => {
  it('runs every scenario through the agent and summarises the results', async () => {
    const report = await runEvals(new FakeLLMProvider(), EVAL_SCENARIOS, { repeat: 2 });
    expect(report.provider).toBe('fake');
    expect(report.scenarios).toHaveLength(EVAL_SCENARIOS.length);
    for (const s of report.scenarios) expect(s.runs).toHaveLength(2);
    expect(report.passRate).toBeGreaterThan(0);
    expect(report.checkPassRate).toBeGreaterThan(report.passRate);
    expect(report.totals.inputTokens).toBeGreaterThan(0);
  });

  it('records a provider error as a failed run instead of crashing', async () => {
    const broken: LLMProvider = {
      name: 'broken',
      generateStructured: () => Promise.reject(new Error('timeout')),
    };
    const report = await runEvals(broken, EVAL_SCENARIOS.slice(0, 2));
    expect(report.passRate).toBe(0);
    expect(report.scenarios[0]?.runs[0]).toMatchObject({ passed: false, error: 'timeout' });
    expect(report.failures[0]).toEqual({ check: 'valid response', count: 2 });
  });
});
