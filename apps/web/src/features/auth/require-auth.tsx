'use client';

import { Building2 } from 'lucide-react';
import { hasPermission, Permission, TenantStatus } from '@rea/shared-types';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Logo } from '@/components/brand/logo';
import { EmptyState, FullPageLoader } from '@/components/states/states';
import { Button } from '@/components/ui/button';
import { useAuth } from './auth-provider';

/**
 * Client-side gate for private screens. It improves navigation only — every API call is
 * authorised by the backend regardless of what the browser renders.
 */
export function RequireAuth({ children, allowPending = false }: { children: React.ReactNode; allowPending?: boolean }) {
  const { status, session, signOut } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const tenant = session?.activeTenant;
  const mustOnboard =
    !allowPending &&
    tenant?.status === TenantStatus.PENDING &&
    hasPermission(tenant.role, Permission.TENANT_UPDATE);

  useEffect(() => {
    if (status === 'unauthenticated') router.replace(`/login?next=${encodeURIComponent(pathname)}`);
    else if (mustOnboard) router.replace('/onboarding');
  }, [status, mustOnboard, pathname, router]);

  if (status !== 'authenticated' || !session || mustOnboard) return <FullPageLoader />;

  if (!tenant) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center px-6">
        <Logo />
        <div className="mt-8 w-full max-w-md rounded-[var(--radius-panel)] border border-line">
          <EmptyState
            icon={Building2}
            title="No active business"
            description="Your access to every business on this account is currently suspended or has been removed. Ask a business owner to restore your access."
            action={
              <Button variant="secondary" onClick={() => void signOut()}>
                Sign out
              </Button>
            }
          />
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
