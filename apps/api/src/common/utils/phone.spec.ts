import { normalizePhone } from './phone';

describe('normalizePhone', () => {
  it.each([
    ['9876543210', '+919876543210'],
    ['98765 43210', '+919876543210'],
    ['098765 43210', '+919876543210'],
    ['91-98765-43210', '+919876543210'],
    ['+91 98765 43210', '+919876543210'],
    ['0091 9876543210', '+919876543210'],
    ['(+91) 98765.43210', '+919876543210'],
    ['  +919876543210  ', '+919876543210'],
    ['+14155552671', '+14155552671'],
    ['+44 7911 123456', '+447911123456'],
  ])('%s → %s', (input, expected) => {
    expect(normalizePhone(input)).toBe(expected);
  });

  it.each([
    '',
    'abc',
    '12345',
    '5876543210', // Indian mobiles start with 6-9
    '+91 5876543210',
    '+91 98765 4321', // too short
    '+91 98765 432100', // too long
    '+0123456789',
    '98765 43210 ext 5',
  ])('rejects %p', (input) => {
    expect(normalizePhone(input)).toBeNull();
  });

  it('is idempotent', () => {
    const once = normalizePhone('98765 43210')!;
    expect(normalizePhone(once)).toBe(once);
  });
});
