import { FakeLLMProvider } from './fake.provider';
import { normaliseMessages } from './llm-provider';

describe('normaliseMessages', () => {
  it('merges consecutive roles, drops blanks and leading assistant turns', () => {
    expect(
      normaliseMessages([
        { role: 'assistant', content: 'Hello' },
        { role: 'user', content: 'Hi' },
        { role: 'user', content: '  ' },
        { role: 'user', content: '3 BHK chahiye' },
        { role: 'assistant', content: 'Budget?' },
      ]),
    ).toEqual([
      { role: 'user', content: 'Hi\n\n3 BHK chahiye' },
      { role: 'assistant', content: 'Budget?' },
    ]);
  });
});

describe('FakeLLMProvider', () => {
  it('extracts budget, BHK and city from Hinglish', async () => {
    const res = await new FakeLLMProvider().generateStructured({
      system:
        '- [id:11111111-1111-4111-8111-111111111111] Flat · 3 BHK · ₹82 lakh\n- [id:22222222-2222-4222-8222-222222222222] Flat · 4 BHK · ₹3 crore',
      messages: [{ role: 'user', content: 'Noida mein 3 BHK chahiye, budget 85 lakh' }],
      tool: { name: 'respond', description: '', inputSchema: {} },
    });
    const output = res.output as {
      lead_updates: Record<string, unknown>;
      suggested_property_ids: string[];
    };
    expect(output.lead_updates).toMatchObject({
      budget_max_rupees: 8_500_000,
      preferred_bedrooms: [3],
      preferred_city: 'Noida',
    });
    expect(output.suggested_property_ids).toEqual(['11111111-1111-4111-8111-111111111111']);
  });
});
