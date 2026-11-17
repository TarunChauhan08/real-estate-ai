import localFont from 'next/font/local';

/**
 * Self-hosted with next/font: the Latin files are preloaded and a size-matched fallback is used
 * while they load, so headlines do not jump and text paints sooner (better Core Web Vitals).
 * Devanagari still comes from @fontsource with unicode-range, so it only downloads on Hindi pages.
 */
const manrope = localFont({
  src: '../../node_modules/@fontsource-variable/manrope/files/manrope-latin-wght-normal.woff2',
  variable: '--font-manrope',
  weight: '200 800',
  display: 'swap',
  fallback: ['Segoe UI', 'system-ui', 'sans-serif'],
});

const fraunces = localFont({
  src: '../../node_modules/@fontsource-variable/fraunces/files/fraunces-latin-wght-normal.woff2',
  variable: '--font-fraunces',
  weight: '100 900',
  display: 'swap',
  fallback: ['Georgia', 'serif'],
});

export const fontVariables = `${manrope.variable} ${fraunces.variable}`;
