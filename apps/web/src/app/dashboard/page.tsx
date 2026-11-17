import type { Metadata } from 'next';
import { Overview } from '@/features/dashboard/overview';

export const metadata: Metadata = { title: 'Overview' };

export default function DashboardPage() {
  return <Overview />;
}
