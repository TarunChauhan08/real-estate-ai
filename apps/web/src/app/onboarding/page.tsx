import type { Metadata } from 'next';
import { Logo } from '@/components/brand/logo';
import { RequireAuth } from '@/features/auth/require-auth';
import { OnboardingForm } from '@/features/onboarding/onboarding-form';

export const metadata: Metadata = { title: 'Set up your business' };

export default function OnboardingPage() {
  return (
    <RequireAuth allowPending>
      <div className="min-h-screen bg-canvas">
        <header className="border-b border-line bg-white px-6 py-4">
          <Logo />
        </header>
        <main className="mx-auto max-w-2xl px-6 py-10">
          <h1 className="text-2xl font-bold tracking-tight text-fg">Tell us about your business</h1>
          <p className="mt-1 text-sm text-fg-muted">
            These details appear to your team and will be used by your AI employee. You can change them later in Settings.
          </p>
          <div className="mt-8 rounded-[var(--radius-panel)] border border-line bg-white p-6 sm:p-8">
            <OnboardingForm />
          </div>
        </main>
      </div>
    </RequireAuth>
  );
}
