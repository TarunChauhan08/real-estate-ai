'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Logo } from '@/components/brand/logo';
import { NAV_ITEMS } from '@/lib/nav';
import { cn } from '@/lib/utils';

export function SidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <nav aria-label="Main" className="flex h-full flex-col bg-brand px-3 py-5">
      <Link href="/dashboard" className="mb-8 px-2" onClick={onNavigate}>
        <Logo inverted />
      </Link>
      <ul className="space-y-0.5">
        {NAV_ITEMS.map((item) => {
          const active = item.href === '/dashboard' ? pathname === '/dashboard' : pathname.startsWith(item.href);
          const Icon = item.icon;
          if (!item.available) {
            return (
              <li key={item.href}>
                <span
                  aria-disabled="true"
                  title={`${item.label} is coming soon`}
                  className="flex cursor-not-allowed items-center gap-3 rounded-[var(--radius-control)] px-3 py-2 text-sm text-brand-line/75"
                >
                  <Icon className="size-4" />
                  <span className="flex-1">{item.label}</span>
                  <span className="rounded-full border border-white/10 px-1.5 py-px text-[10px] font-medium text-brand-line/80">
                    Soon
                  </span>
                </span>
              </li>
            );
          }
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                onClick={onNavigate}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'flex items-center gap-3 rounded-[var(--radius-control)] px-3 py-2 text-sm font-medium transition-colors',
                  active ? 'bg-white/10 text-white' : 'text-brand-soft-2 hover:bg-white/5 hover:text-white',
                )}
              >
                <Icon className={cn('size-4', active && 'text-attention')} />
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
      <p className="mt-auto px-3 pt-6 text-xs leading-relaxed text-brand-line/80">
        Modules marked “Soon” are part of upcoming releases.
      </p>
    </nav>
  );
}
