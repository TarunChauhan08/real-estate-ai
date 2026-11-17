import type { Metadata } from 'next';
import { DashboardShell } from '@/components/layout/dashboard-shell';
import { RequireAuth } from '@/features/auth/require-auth';

/** The signed-in app is private: never index it. */
export const metadata: Metadata = { robots: { index: false, follow: false } };

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <RequireAuth>
      <DashboardShell>{children}</DashboardShell>
    </RequireAuth>
  );
}
