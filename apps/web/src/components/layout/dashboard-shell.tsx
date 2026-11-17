'use client';

import { X } from 'lucide-react';
import { useState } from 'react';
import { SidebarNav } from './sidebar';
import { Topbar } from './topbar';
import { DeletionBanner } from './deletion-banner';
import { VerifyEmailBanner } from './verify-email-banner';

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const [menuOpen, setMenuOpen] = useState(false);
  return (
    <div className="min-h-screen overflow-x-clip bg-canvas lg:pl-64">
      <aside className="fixed inset-y-0 left-0 hidden w-64 lg:block">
        <SidebarNav />
      </aside>

      {menuOpen && (
        <div
          className="fixed inset-0 z-40 lg:hidden"
          role="dialog"
          aria-modal="true"
          aria-label="Navigation"
        >
          <div className="absolute inset-0 bg-brand-deep/40" onClick={() => setMenuOpen(false)} />
          <div className="absolute inset-y-0 left-0 w-72">
            <SidebarNav onNavigate={() => setMenuOpen(false)} />
            <button
              type="button"
              onClick={() => setMenuOpen(false)}
              className="absolute right-3 top-5 rounded-md p-1.5 text-brand-soft-2 hover:bg-white/10"
              aria-label="Close navigation"
            >
              <X className="size-5" />
            </button>
          </div>
        </div>
      )}

      <Topbar onOpenMenu={() => setMenuOpen(true)} />
      <DeletionBanner />
      <VerifyEmailBanner />
      <main className="mx-auto w-full min-w-0 max-w-6xl px-4 py-8 sm:px-6 lg:px-10">
        {children}
      </main>
    </div>
  );
}

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-fg">{title}</h1>
        {description && <p className="mt-1 max-w-2xl text-sm text-fg-muted">{description}</p>}
      </div>
      {actions}
    </div>
  );
}
