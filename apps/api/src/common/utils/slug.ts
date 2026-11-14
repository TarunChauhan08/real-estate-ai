import { randomBytes } from 'node:crypto';

const MAX_BASE_LENGTH = 60;

/** Lower-case, hyphenated ASCII slug. Non-Latin names fall back to `business`. */
export function slugify(value: string): string {
  const slug = value
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, MAX_BASE_LENGTH)
    .replace(/-+$/g, '');
  return slug || 'business';
}

/** Slug with a short random suffix so tenant slugs are unique and not guessable from the name. */
export function uniqueSlug(value: string): string {
  return `${slugify(value)}-${randomBytes(3).toString('hex')}`;
}
