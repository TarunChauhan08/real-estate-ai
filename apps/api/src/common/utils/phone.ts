const E164 = /^\+[1-9]\d{7,14}$/;

/**
 * Turns a phone number as people type it into E.164 (`+919876543210`), or `null` if it is not
 * a plausible number. Bare Indian mobile numbers are the common case, so these all work:
 *
 *   98765 43210 · 09876543210 · 91-98765-43210 · +91 98765 43210 · 0091 9876543210
 *
 * Numbers with another country code are accepted if they are valid E.164. `+91` numbers must
 * be 10-digit Indian mobile numbers (starting 6-9).
 *
 * Why normalise at all: leads are de-duplicated per business on `phone`, and WhatsApp/voice
 * providers identify people by E.164. "98765 43210" and "+919876543210" must be the same lead.
 */
export function normalizePhone(input: string): string | null {
  let value = input.trim().replace(/[\s\-().]/g, '');
  if (value.startsWith('00')) value = `+${value.slice(2)}`;

  if (!value.startsWith('+')) {
    if (/^[6-9]\d{9}$/.test(value)) value = `+91${value}`;
    else if (/^0[6-9]\d{9}$/.test(value)) value = `+91${value.slice(1)}`;
    else if (/^91[6-9]\d{9}$/.test(value)) value = `+${value}`;
    else return null;
  }

  if (value.startsWith('+91') && !/^\+91[6-9]\d{9}$/.test(value)) return null;
  return E164.test(value) ? value : null;
}

export const E164_PATTERN = E164;
