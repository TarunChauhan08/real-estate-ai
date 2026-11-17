import { slugify, uniqueSlug } from './slug';

describe('slug', () => {
  it('normalises names into URL-safe slugs', () => {
    expect(slugify('  Noida Homes Brokerage!! ')).toBe('noida-homes-brokerage');
    expect(slugify('Café Développeurs & Co.')).toBe('cafe-developpeurs-co');
  });

  it('falls back for names without Latin characters', () => {
    expect(slugify('नोएडा होम्स')).toBe('business');
  });

  it('adds a random suffix', () => {
    expect(uniqueSlug('ABC Developers')).toMatch(/^abc-developers-[0-9a-f]{6}$/);
  });
});
