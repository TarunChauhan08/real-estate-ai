import { parseAgentDecision } from './response';

const ID_A = '11111111-1111-4111-8111-111111111111';
const ID_B = '22222222-2222-4222-8222-222222222222';

const base = {
  reply: '  Namaste! Budget kitna hai?  ',
  language: 'hinglish',
  lead_updates: {},
  temperature: 'WARM',
  qualified: false,
  suggested_property_ids: [],
  site_visit_requested: false,
  handoff_to_human: false,
};

describe('parseAgentDecision', () => {
  it('trims the reply and keeps valid fields', () => {
    const d = parseAgentDecision(base, [])!;
    expect(d.reply).toBe('Namaste! Budget kitna hai?');
    expect(d.language).toBe('hinglish');
    expect(d.temperature).toBe('WARM');
  });

  it('rejects output without a usable reply', () => {
    expect(parseAgentDecision({ ...base, reply: '   ' }, [])).toBeNull();
    expect(parseAgentDecision('not an object', [])).toBeNull();
  });

  it('drops property IDs the model was never shown', () => {
    const d = parseAgentDecision(
      { ...base, suggested_property_ids: [ID_A, ID_B, ID_A, 'made-up'] },
      [ID_A],
    )!;
    expect(d.suggestedPropertyIds).toEqual([ID_A]);
  });

  it('swaps an inverted budget and drops invalid values instead of failing', () => {
    const d = parseAgentDecision(
      {
        ...base,
        temperature: 'SCORCHING',
        lead_updates: {
          budget_min_rupees: 9_000_000,
          budget_max_rupees: 6_000_000,
          preferred_bedrooms: [3, 2, 3],
          email: 'not-an-email',
          purpose: 'FLIPPING',
        },
      },
      [],
    )!;
    expect(d.leadUpdates).toEqual({
      budgetMin: 6_000_000,
      budgetMax: 9_000_000,
      preferredBedrooms: [2, 3],
    });
    expect(d.temperature).toBe('UNSCORED');
  });

  it('only keeps a handoff reason when a handoff was requested', () => {
    expect(parseAgentDecision({ ...base, handoff_reason: 'x' }, [])!.handoff).toEqual({
      requested: false,
      reason: null,
    });
    expect(
      parseAgentDecision(
        { ...base, handoff_to_human: true, handoff_reason: 'Wants a discount' },
        [],
      )!.handoff,
    ).toEqual({ requested: true, reason: 'Wants a discount' });
  });
});
