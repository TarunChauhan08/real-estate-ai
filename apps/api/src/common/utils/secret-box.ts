import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';

const VERSION = 'v1';
const IV_BYTES = 12;
const TAG_BYTES = 16;

/**
 * Authenticated encryption (AES-256-GCM) for secrets the app must be able to read back,
 * such as a business's WhatsApp access token. Passwords and refresh tokens are hashed
 * instead — they never need to be decrypted.
 *
 * Stored format: `v1:` + base64(iv | auth tag | ciphertext). The version prefix allows
 * key rotation or a different algorithm later without guessing what a value is.
 */
export class SecretBox {
  private readonly key: Buffer;

  constructor(key: Buffer) {
    if (key.length !== 32) throw new Error('SecretBox key must be 32 bytes');
    this.key = key;
  }

  /** Development fallback: derive a stable key from another secret. Never used in production. */
  static fromPassphrase(passphrase: string): SecretBox {
    return new SecretBox(createHash('sha256').update(`secret-box:${passphrase}`).digest());
  }

  encrypt(plaintext: string): string {
    const iv = randomBytes(IV_BYTES);
    const cipher = createCipheriv('aes-256-gcm', this.key, iv);
    const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
    const tag = cipher.getAuthTag();
    return `${VERSION}:${Buffer.concat([iv, tag, ciphertext]).toString('base64')}`;
  }

  /** Throws if the value was tampered with or encrypted with another key. */
  decrypt(stored: string): string {
    const [version, payload] = stored.split(':', 2);
    if (version !== VERSION || !payload) throw new Error('Unsupported secret format');
    const raw = Buffer.from(payload, 'base64');
    if (raw.length <= IV_BYTES + TAG_BYTES) throw new Error('Secret is truncated');
    const iv = raw.subarray(0, IV_BYTES);
    const tag = raw.subarray(IV_BYTES, IV_BYTES + TAG_BYTES);
    const ciphertext = raw.subarray(IV_BYTES + TAG_BYTES);
    const decipher = createDecipheriv('aes-256-gcm', this.key, iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString('utf8');
  }
}
