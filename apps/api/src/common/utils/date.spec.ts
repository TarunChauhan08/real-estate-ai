import { formatDateOnly, parseDateOnly } from './date';

describe('date-only helpers', () => {
  it('round-trips a valid date', () => {
    expect(formatDateOnly(parseDateOnly('2027-03-15')!)).toBe('2027-03-15');
  });

  it('accepts leap days only in leap years', () => {
    expect(parseDateOnly('2028-02-29')).not.toBeNull();
    expect(parseDateOnly('2027-02-29')).toBeNull();
  });

  it.each(['2026-02-31', '2026-13-01', '2026-00-10', '26-01-01', '2026/01/01', '', 'tomorrow'])(
    'rejects %p',
    (value) => {
      expect(parseDateOnly(value)).toBeNull();
    },
  );
});
