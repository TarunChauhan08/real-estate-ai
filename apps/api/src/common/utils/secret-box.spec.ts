import { randomBytes } from 'node:crypto';
import { SecretBox } from './secret-box';

describe('SecretBox', () => {
  const box = new SecretBox(randomBytes(32));

  it('round-trips a secret and never stores it in the clear', () => {
    const token = 'EAAG-whatsapp-system-user-token-1234567890';
    const stored = box.encrypt(token);
    expect(stored.startsWith('v1:')).toBe(true);
    expect(stored).not.toContain(token);
    expect(box.decrypt(stored)).toBe(token);
  });

  it('uses a fresh IV every time', () => {
    expect(box.encrypt('same')).not.toBe(box.encrypt('same'));
  });

  it('rejects tampered values and values from another key', () => {
    const stored = box.encrypt('secret');
    const raw = Buffer.from(stored.slice(3), 'base64');
    raw.writeUInt8(raw.readUInt8(raw.length - 1) ^ 0xff, raw.length - 1);
    expect(() => box.decrypt(`v1:${raw.toString('base64')}`)).toThrow();
    expect(() => new SecretBox(randomBytes(32)).decrypt(stored)).toThrow();
    expect(() => box.decrypt('v2:abc')).toThrow(/format/);
  });

  it('derives a stable development key from a passphrase', () => {
    const a = SecretBox.fromPassphrase('dev-secret');
    const b = SecretBox.fromPassphrase('dev-secret');
    expect(b.decrypt(a.encrypt('x'))).toBe('x');
  });

  it('refuses keys of the wrong size', () => {
    expect(() => new SecretBox(Buffer.alloc(16))).toThrow(/32 bytes/);
  });
});
