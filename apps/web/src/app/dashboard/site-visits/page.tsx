import type { Metadata } from 'next';
import { PageHeader } from '@/components/layout/dashboard-shell';
import { SiteVisitsView } from '@/features/site-visits/site-visits-view';

export const metadata: Metadata = { title: 'Site visits' };

export default function SiteVisitsPage() {
  return (
    <>
      <PageHeader
        title="Site visits"
        description="Buyers ask the AI for a visit; you confirm the exact time and the buyer is told on WhatsApp."
      />
      <SiteVisitsView />
    </>
  );
}
