import { istDate, periodStart } from './ai-usage.service';

describe('AI usage periods (IST)', () => {
  it('uses the Indian calendar day', () => {
    // 20:00 UTC on 1 Dec is 01:30 IST on 2 Dec.
    expect(istDate(new Date('2026-12-01T20:00:00Z'))).toBe('2026-12-02');
    expect(istDate(new Date('2026-12-01T18:00:00Z'))).toBe('2026-12-01');
  });

  it('starts at IST midnight, counting today as day one', () => {
    const now = new Date('2026-12-10T06:00:00Z'); // 11:30 IST on 10 Dec
    expect(periodStart(now, 1).toISOString()).toBe('2026-12-09T18:30:00.000Z');
    expect(periodStart(now, 7).toISOString()).toBe('2026-12-03T18:30:00.000Z');
    expect(istDate(periodStart(now, 7))).toBe('2026-12-04');
  });
});
