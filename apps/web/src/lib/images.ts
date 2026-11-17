/**
 * Marketing photography. Every photo is from Unsplash (https://unsplash.com/license):
 * free for commercial use, no permission needed. Credit is appreciated, not required.
 *
 * To swap a photo, change its `id` (the part after `photo-` in an images.unsplash.com URL).
 * Run `pnpm --filter @rea/web images:download` to keep local copies for self-hosted installs.
 */
export interface SitePhoto {
  id: string;
  alt: string;
}

export const PHOTOS = {
  hero: {
    id: '1600596542815-ffad4c1539a9',
    alt: 'Modern home with warm lights at dusk',
  },
  interior: {
    id: '1600210492486-724fe5c67fb0',
    alt: 'Bright, modern living room with large windows',
  },
  towers: {
    id: '1545324418-cc1a3fa10c00',
    alt: 'Modern residential tower with balconies against a blue sky',
  },
  phone: {
    id: '1512941937669-90a1b58e7e9c',
    alt: 'Person messaging on a smartphone',
  },
  keys: {
    id: '1560518883-ce09059eeffa',
    alt: 'House keys with a house-shaped keyring handed over',
  },
  villa: {
    id: '1613490493576-7fde63acd811',
    alt: 'Luxury villa with a pool at twilight',
  },
  kitchen: {
    id: '1600607687939-ce8a6c25118c',
    alt: 'Premium open kitchen with an island',
  },
  skyline: {
    id: '1486406146926-c627a92ad1ab',
    alt: 'Glass towers seen from street level',
  },
} satisfies Record<string, SitePhoto>;

export type PhotoKey = keyof typeof PHOTOS;

const selfHosted = process.env.NEXT_PUBLIC_SELF_HOSTED_IMAGES === 'true';

/** Source URL at 4K width; Next.js generates smaller AVIF/WebP versions per screen size. */
export function photoSrc(key: PhotoKey): string {
  if (selfHosted) return `/images/${key}.jpg`;
  return `https://images.unsplash.com/photo-${PHOTOS[key].id}?auto=format&fit=crop&w=3840&q=80`;
}
