'use client';

import { PageHeader } from '@/components/layout/dashboard-shell';
import { WhatsAppPanel } from '@/features/integrations/whatsapp-panel';

export default function IntegrationsPage() {
  return (
    <>
      <PageHeader
        title="Integrations"
        description="Connect the channels where buyers reach you. Your AI employee works on every connected channel."
      />
      <WhatsAppPanel />
    </>
  );
}
