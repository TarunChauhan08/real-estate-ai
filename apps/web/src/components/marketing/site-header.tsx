'use client';

import { Menu, X } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Logo } from '@/components/brand/logo';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

// Absolute paths so the header works on every public page, not only the home page.
const LINKS = [
  { href: '/#how-it-works', label: 'How it works' },
  { href: '/#solutions', label: 'Solutions' },
  { href: '/whatsapp-ai-for-real-estate', label: 'WhatsApp AI' },
  { href: '/guides', label: 'Guides' },
  { href: '/#faq', label: 'FAQ' },
];

/** Transparent over the hero photo, turns solid white once the visitor scrolls. */
export function SiteHeader() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);
  const solid = scrolled || open;

  return (
    <header
      className={cn(
        'fixed inset-x-0 top-0 z-40 transition-all duration-300',
        solid ? 'border-b border-line bg-white/90 shadow-sm backdrop-blur-md' : 'bg-transparent',
      )}
    >
      <div className="mx-auto flex h-18 max-w-7xl items-center justify-between gap-6 px-5 sm:px-8">
        <Link href="/">
          <Logo inverted={!solid} />
        </Link>
        <nav aria-label="Sections" className="hidden items-center gap-8 lg:flex">
          {LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                'text-sm font-medium transition-colors',
                solid ? 'text-fg-secondary hover:text-brand' : 'text-white/80 hover:text-white',
              )}
            >
              {link.label}
            </Link>
          ))}
        </nav>
        <div className="hidden items-center gap-2 sm:flex">
          <Button asChild variant={solid ? 'ghost' : 'glass'} size="md">
            <Link href="/login">Sign in</Link>
          </Button>
          <Button asChild variant={solid ? 'primary' : 'gold'} size="md">
            <Link href="/register">Get started free</Link>
          </Button>
        </div>
        <button
          type="button"
          className={cn('rounded-md p-2 sm:hidden', solid ? 'text-fg' : 'text-white')}
          aria-label={open ? 'Close menu' : 'Open menu'}
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
        >
          {open ? <X className="size-5" /> : <Menu className="size-5" />}
        </button>
      </div>
      {open && (
        <div className="border-t border-line bg-white px-5 pb-6 pt-2 sm:hidden">
          <ul className="space-y-1">
            {LINKS.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  onClick={() => setOpen(false)}
                  className="block rounded-md px-2 py-2.5 text-[15px] font-medium text-fg-secondary"
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
          <div className="mt-4 grid gap-2">
            <Button asChild variant="secondary">
              <Link href="/login">Sign in</Link>
            </Button>
            <Button asChild>
              <Link href="/register">Get started free</Link>
            </Button>
          </div>
        </div>
      )}
    </header>
  );
}
