import path from 'node:path';
import { loadEnvConfig } from '@next/env';
import type { NextConfig } from 'next';

// The monorepo keeps one `.env` at the repository root; load it for the web app too.
loadEnvConfig(path.resolve(__dirname, '../..'));

const securityHeaders = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
];

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  transpilePackages: ['@rea/shared-types'],
  images: {
    // Marketing photography is served from Unsplash's CDN (free licence) and resized by Next.js.
    // For on-prem installs, run `pnpm --filter @rea/web images:download` and set
    // NEXT_PUBLIC_SELF_HOSTED_IMAGES=true to serve copies from /public/images instead.
    remotePatterns: [{ protocol: 'https', hostname: 'images.unsplash.com' }],
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 828, 1080, 1280, 1600, 1920, 2560, 3840],
  },
  async headers() {
    return [{ source: '/:path*', headers: securityHeaders }];
  },
};

export default nextConfig;
