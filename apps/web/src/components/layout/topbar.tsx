'use client';

import { ROLE_LABELS } from '@rea/shared-types';
import { Check, ChevronsUpDown, LogOut, Menu, Settings } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { type MeResponse } from '@rea/shared-types';
import { toast } from 'sonner';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAuth } from '@/features/auth/auth-provider';
import { api } from '@/lib/api-client';
import { queryKeys } from '@/lib/query-keys';
import { initials } from '@/lib/utils';

export function Topbar({ onOpenMenu }: { onOpenMenu: () => void }) {
  const { session, signOut, switchTenant } = useAuth();
  const router = useRouter();
  const me = useQuery({ queryKey: queryKeys.me, queryFn: () => api<MeResponse>('/auth/me') });
  const tenant = session?.activeTenant;
  const user = session?.user;
  if (!tenant || !user) return null;

  const memberships = me.data?.memberships ?? [];

  const handleSwitch = async (tenantId: string) => {
    if (tenantId === tenant.id) return;
    try {
      await switchTenant(tenantId);
      router.push('/dashboard');
    } catch {
      toast.error('Could not switch business. Your access may have changed.');
    }
  };

  const handleSignOut = async () => {
    await signOut();
    router.replace('/login');
  };

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-line bg-white/95 px-4 backdrop-blur sm:px-6">
      <button
        type="button"
        onClick={onOpenMenu}
        className="rounded-md p-2 text-fg-muted hover:bg-subtle lg:hidden"
        aria-label="Open navigation"
      >
        <Menu className="size-5" />
      </button>

      <DropdownMenu>
        <DropdownMenuTrigger className="flex min-w-0 items-center gap-2 rounded-[var(--radius-control)] px-2 py-1.5 text-left hover:bg-subtle">
          <span className="min-w-0">
            <span className="block truncate text-sm font-semibold text-fg">{tenant.name}</span>
            <span className="block text-xs text-fg-muted">{ROLE_LABELS[tenant.role]}</span>
          </span>
          <ChevronsUpDown className="size-4 shrink-0 text-fg-muted" aria-hidden />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          <DropdownMenuLabel>Your businesses</DropdownMenuLabel>
          {memberships.map((m) => (
            <DropdownMenuItem key={m.membershipId} onSelect={() => void handleSwitch(m.tenant.id)}>
              <span className="flex-1 truncate">{m.tenant.name}</span>
              {m.tenant.id === tenant.id && <Check className="text-brand-fg" aria-label="Current business" />}
            </DropdownMenuItem>
          ))}
          {memberships.length === 0 && <DropdownMenuItem disabled>Loading…</DropdownMenuItem>}
        </DropdownMenuContent>
      </DropdownMenu>

      <div className="ml-auto">
        <DropdownMenu>
          <DropdownMenuTrigger
            className="flex size-9 items-center justify-center rounded-full bg-brand-soft-2 text-sm font-bold text-brand-strong hover:bg-brand-line"
            aria-label="Account menu"
          >
            {initials(user.name)}
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>
              <span className="block text-sm font-semibold text-fg">{user.name}</span>
              <span className="block truncate">{user.email}</span>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/dashboard/settings?tab=account">
                <Settings /> Account settings
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => void handleSignOut()}>
              <LogOut /> Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
