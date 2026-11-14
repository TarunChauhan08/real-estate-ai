import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: { default: 'AI Real Estate Sales Employee', template: '%s · AI Real Estate Sales Employee' },
  description: 'Never miss a property enquiry. Turn more enquiries into qualified buyers and site visits.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-IN">
      <body className="min-h-screen bg-white font-sans text-slate-900 antialiased">{children}</body>
    </html>
  );
}
