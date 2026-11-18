import localFont from 'next/font/local';

/**
 * Typography — inspired by Nothing OS.
 *   Doto          — dot-matrix display face (headlines and big numbers only; never body copy).
 *   Space Grotesk — clean, slightly technical grotesk for all UI and body text.
 *   Space Mono    — monospaced labels, eyebrows and data ("system readout" feel).
 *
 * Self-hosted with next/font: the Latin files are preloaded and a size-matched fallback is used
 * while they load, so headlines do not jump and text paints sooner (better Core Web Vitals).
 * Devanagari still comes from @fontsource with unicode-range, so it only downloads on Hindi pages.
 */
const grotesk = localFont({
  src: '../../node_modules/@fontsource-variable/space-grotesk/files/space-grotesk-latin-wght-normal.woff2',
  variable: '--font-grotesk',
  weight: '300 700',
  display: 'swap',
  fallback: ['Segoe UI', 'system-ui', 'sans-serif'],
});

const doto = localFont({
  src: '../../node_modules/@fontsource-variable/doto/files/doto-latin-wght-normal.woff2',
  variable: '--font-doto',
  weight: '100 900',
  display: 'swap',
  fallback: ['ui-monospace', 'monospace'],
});

const mono = localFont({
  src: [
    {
      path: '../../node_modules/@fontsource/space-mono/files/space-mono-latin-400-normal.woff2',
      weight: '400',
    },
    {
      path: '../../node_modules/@fontsource/space-mono/files/space-mono-latin-700-normal.woff2',
      weight: '700',
    },
  ],
  variable: '--font-space-mono',
  display: 'swap',
  fallback: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
});

export const fontVariables = `${grotesk.variable} ${doto.variable} ${mono.variable}`;
