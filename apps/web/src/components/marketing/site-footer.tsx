import Link from 'next/link';
import { Logo } from '@/components/brand/logo';
import { COMPANY } from '@/lib/company';
import { GUIDES, SOLUTIONS } from '@/lib/marketing-content';

/** Footer for every public page. Its links help visitors — and search engines — find every page. */
export function SiteFooter() {
  return (
    <footer className="bg-brand-deep text-brand-line">
      <div className="mx-auto grid max-w-7xl gap-10 px-5 py-14 sm:px-8 md:grid-cols-[1.2fr_1fr_1fr_0.8fr]">
        <div>
          <Logo inverted />
          <p className="mt-4 max-w-xs text-sm leading-relaxed">
            The AI sales agent for Indian real estate. Answers every enquiry on WhatsApp and web, in
            Hindi, English and Hinglish.
          </p>
        </div>
        <nav aria-label="Solutions">
          <p className="text-sm font-semibold text-white">Solutions</p>
          <ul className="mt-4 space-y-2.5 text-sm">
            {SOLUTIONS.map((s) => (
              <li key={s.slug}>
                <Link href={`/${s.slug}`} className="hover:text-white">
                  {s.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <nav aria-label="Guides">
          <p className="text-sm font-semibold text-white">
            <Link href="/guides" className="hover:text-gold-light">
              Guides
            </Link>
          </p>
          <ul className="mt-4 space-y-2.5 text-sm">
            {GUIDES.map((g) => (
              <li key={g.slug}>
                <Link href={`/guides/${g.slug}`} className="hover:text-white">
                  {g.metaTitle}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <nav aria-label="Company">
          <p className="text-sm font-semibold text-white">Product</p>
          <ul className="mt-4 space-y-2.5 text-sm">
            <li>
              <Link href="/#how-it-works" className="hover:text-white">
                How it works
              </Link>
            </li>
            <li>
              <Link href="/#trust" className="hover:text-white">
                Trust & security
              </Link>
            </li>
            <li>
              <Link href="/#faq" className="hover:text-white">
                FAQ
              </Link>
            </li>
            <li>
              <Link href="/contact" className="hover:text-white">
                Request a demo
              </Link>
            </li>
            <li>
              <Link href="/about" className="hover:text-white">
                About us
              </Link>
            </li>
            <li>
              <Link href="/login" className="hover:text-white">
                Sign in
              </Link>
            </li>
          </ul>
        </nav>
      </div>
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 border-t border-white/10 px-5 py-6 text-xs sm:px-8">
        <p>
          © {new Date().getFullYear()} {COMPANY.legalName} · Photography from Unsplash
        </p>
        <nav aria-label="Legal" className="flex gap-5">
          <Link href="/privacy" className="hover:text-white">
            Privacy Policy
          </Link>
          <Link href="/terms" className="hover:text-white">
            Terms of Service
          </Link>
          <Link href="/contact" className="hover:text-white">
            Contact
          </Link>
        </nav>
      </div>
    </footer>
  );
}
