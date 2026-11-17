import { type AgentDecision } from '../ai/sales-agent/response';
import { type LeadSnapshot, PLACEHOLDER_LEAD_NAME, planLeadUpdate } from './lead-update';

const lead = (overrides: Partial<LeadSnapshot> = {}): LeadSnapshot => ({
  name: 'Rahul',
  email: null,
  status: 'NEW',
  temperature: 'UNSCORED',
  budgetMin: null,
  budgetMax: null,
  preferredCity: null,
  preferredLocalities: [],
  preferredBedrooms: [],
  purpose: null,
  timeline: null,
  needsHomeLoan: null,
  preferredLanguage: null,
  ...overrides,
});

const decision = (overrides: Partial<AgentDecision> = {}): AgentDecision => ({
  reply: 'ok',
  language: 'hinglish',
  leadUpdates: {},
  temperature: 'UNSCORED',
  qualified: false,
  suggestedPropertyIds: [],
  siteVisitRequested: false,
  siteVisitPreference: null,
  handoff: { requested: false, reason: null },
  ...overrides,
});

describe('planLeadUpdate', () => {
  it('moves a new lead to CONTACTED and records the language', () => {
    expect(planLeadUpdate(lead(), decision())).toEqual({
      status: 'CONTACTED',
      preferredLanguage: 'hinglish',
    });
  });

  it('qualifies, fills facts and scores temperature', () => {
    const patch = planLeadUpdate(
      lead({ status: 'CONTACTED', preferredLanguage: 'hinglish' }),
      decision({
        qualified: true,
        temperature: 'HOT',
        leadUpdates: { budgetMax: 8_500_000, preferredCity: 'Noida', preferredBedrooms: [3] },
      }),
    );
    expect(patch).toEqual({
      status: 'QUALIFIED',
      temperature: 'HOT',
      budgetMax: 8_500_000,
      preferredCity: 'Noida',
      preferredBedrooms: [3],
    });
  });

  it('never moves a lead backwards or out of a closed state', () => {
    expect(
      planLeadUpdate(lead({ status: 'NEGOTIATION' }), decision({ qualified: true })).status,
    ).toBeUndefined();
    expect(
      planLeadUpdate(lead({ status: 'WON' }), decision({ qualified: true })).status,
    ).toBeUndefined();
    expect(planLeadUpdate(lead({ status: 'LOST' }), decision()).status).toBeUndefined();
  });

  it('keeps human-entered names and emails, but replaces the placeholder name', () => {
    const updates = { name: 'Amit', email: 'amit@example.com' };
    expect(
      planLeadUpdate(lead({ email: 'x@y.com' }), decision({ leadUpdates: updates })),
    ).not.toHaveProperty('name');
    expect(
      planLeadUpdate(lead({ email: 'x@y.com' }), decision({ leadUpdates: updates })),
    ).not.toHaveProperty('email');
    expect(
      planLeadUpdate(lead({ name: PLACEHOLDER_LEAD_NAME }), decision({ leadUpdates: updates }))
        .name,
    ).toBe('Amit');
  });

  it('merges localities case-insensitively', () => {
    const patch = planLeadUpdate(
      lead({ preferredLocalities: ['Sector 150'] }),
      decision({ leadUpdates: { preferredLocalities: ['sector 150', 'Sector 137'] } }),
    );
    expect(patch.preferredLocalities).toEqual(['Sector 150', 'Sector 137']);
  });

  it('drops a stored budget bound that the new one contradicts', () => {
    const patch = planLeadUpdate(
      lead({ budgetMin: 9_000_000 }),
      decision({ leadUpdates: { budgetMax: 7_000_000 } }),
    );
    expect(patch.budgetMin).toBeNull();
    expect(patch.budgetMax).toBe(7_000_000);
  });

  it('does not reset temperature when the AI is unsure', () => {
    expect(
      planLeadUpdate(lead({ temperature: 'HOT' }), decision({ temperature: 'UNSCORED' })),
    ).not.toHaveProperty('temperature');
  });
});
