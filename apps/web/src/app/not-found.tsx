import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-6 text-center">
      <p className="text-sm font-semibold text-attention-fg">404</p>
      <h1 className="mt-2 text-2xl font-bold tracking-tight text-fg">This page doesn’t exist</h1>
      <p className="mt-2 text-sm text-fg-muted">Check the address, or head back to your workspace.</p>
      <Button asChild className="mt-6">
        <Link href="/dashboard">Go to dashboard</Link>
      </Button>
    </main>
  );
}
