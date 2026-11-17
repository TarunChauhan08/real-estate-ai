import { isValidTimeZone } from './is-time-zone';

describe('isValidTimeZone', () => {
  it.each(['Asia/Kolkata', 'Asia/Calcutta', 'UTC', 'Asia/Dubai'])('accepts %s', (zone) => {
    expect(isValidTimeZone(zone)).toBe(true);
  });

  it.each(['Mars/Olympus', '', 'Asia/Atlantis', 42, null])('rejects %p', (zone) => {
    expect(isValidTimeZone(zone)).toBe(false);
  });
});
