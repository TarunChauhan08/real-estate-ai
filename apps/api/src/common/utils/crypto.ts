import { createHash, randomBytes } from 'node:crypto';

/** Cryptographically secure, URL-safe random token (default 256 bits). */
export function generateToken(bytes = 32): string {
  return randomBytes(bytes).toString('base64url');
}

/**
 * SHA-256 hex digest. Used to store refresh and invitation tokens: they are high-entropy
 * random values, so a fast hash is appropriate (unlike passwords, which use Argon2id).
 */
export function sha256Hex(value: string): string {
  return createHash('sha256').update(value, 'utf8').digest('hex');
}
