import Link from 'next/link';
import { Logo } from '@/components/brand/logo';

const LANGUAGES = [
  { script: 'मुझे नोएडा में 3 BHK फ्लैट चाहिए।', label: 'Hindi' },
  { script: 'I am looking for a 3 BHK apartment in Noida.', label: 'English' },
  { script: 'Budget 80 lakh hai, Sector 150 mein chahiye.', label: 'Hinglish' },
];

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-screen lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
      <aside className="relative hidden overflow-hidden bg-brand px-12 py-10 text-white lg:flex lg:flex-col">
        <Link href="/" className="w-fit">
          <Logo inverted />
        </Link>
        <div className="mt-auto max-w-md">
          <p className="text-[28px] font-semibold leading-[1.2] tracking-tight">
            Never miss a property enquiry. Turn more enquiries into qualified buyers and site visits.
          </p>
          <p className="mt-4 text-sm leading-relaxed text-brand-line">
            Your AI sales employee will speak with buyers the way they write to you.
          </p>
          <ul className="mt-8 space-y-3" aria-label="Supported languages">
            {LANGUAGES.map((item) => (
              <li key={item.label} className="rounded-[var(--radius-control)] border border-white/10 bg-white/5 px-4 py-3">
                <p className="text-[15px] leading-snug">{item.script}</p>
                <p className="mt-1 text-xs text-brand-line">{item.label}</p>
              </li>
            ))}
          </ul>
        </div>
      </aside>
      <main className="flex flex-col px-6 py-10 sm:px-12">
        <Link href="/" className="w-fit lg:hidden">
          <Logo />
        </Link>
        <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center py-10">{children}</div>
      </main>
    </div>
  );
}
