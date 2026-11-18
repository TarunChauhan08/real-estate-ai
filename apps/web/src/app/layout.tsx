import type { Metadata, Viewport } from 'next';
import { GOOGLE_SITE_VERIFICATION, SITE_DESCRIPTION, SITE_NAME, SITE_URL } from '@/lib/site';
import { fontVariables } from './fonts';
import { Providers } from './providers';
import './globals.css';

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: SITE_NAME,
    template: `%s · ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  openGraph: {
    type: 'website',
    siteName: SITE_NAME,
    locale: 'en_IN',
  },
  twitter: { card: 'summary_large_image' },
  verification: GOOGLE_SITE_VERIFICATION ? { google: GOOGLE_SITE_VERIFICATION } : undefined,
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  themeColor: '#000000',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-IN" className={fontVariables}>
      <body className="min-h-screen bg-white font-sans text-fg">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
