import { buildVisitMessage, formatVisitTime, toVisitLanguage } from './visit-messages';

const base = {
  timeZone: 'Asia/Kolkata',
  businessName: 'Skyline Realty',
  propertyTitle: '3 BHK Sector 150',
  place: 'Noida',
  agentName: 'Rohan',
  // 05:30 UTC = 11:00 am in India.
  scheduledAt: new Date('2026-11-21T05:30:00Z'),
};

describe('site visit messages', () => {
  it('confirms a visit in English, in the business’s time zone', () => {
    expect(buildVisitMessage({ ...base, kind: 'confirmed', language: 'en' })).toBe(
      [
        'Your site visit is confirmed ✅',
        '📅 Sat, 21 Nov, 11:00 am',
        '🏠 3 BHK Sector 150, Noida',
        '👤 Rohan will meet you there.',
        'Reply here if you need to change anything. — Skyline Realty',
      ].join('\n'),
    );
  });

  it('writes Hinglish and Hindi for buyers who prefer them', () => {
    expect(buildVisitMessage({ ...base, kind: 'reminder', language: 'hinglish' })).toMatch(
      /^Yaad dila rahe hain/,
    );
    expect(buildVisitMessage({ ...base, kind: 'confirmed', language: 'hi' })).toContain(
      'आपकी साइट विज़िट पक्की हो गई है',
    );
  });

  it('leaves out lines it has nothing for', () => {
    const text = buildVisitMessage({
      ...base,
      kind: 'rescheduled',
      language: null,
      propertyTitle: null,
      place: null,
      agentName: null,
    });
    expect(text.split('\n')).toHaveLength(3);
    expect(text).not.toContain('🏠');
    expect(text).not.toContain('👤');
  });

  it('a cancellation does not repeat the old time', () => {
    const text = buildVisitMessage({ ...base, kind: 'cancelled', language: 'en' });
    expect(text).not.toContain('📅');
    expect(text).toContain('Reply here whenever you would like a new time.');
  });

  it('falls back to English for unknown languages', () => {
    expect(toVisitLanguage('fr')).toBe('en');
    expect(toVisitLanguage(null)).toBe('en');
    expect(formatVisitTime(base.scheduledAt, 'Asia/Kolkata', 'en')).toBe('Sat, 21 Nov, 11:00 am');
  });
});
