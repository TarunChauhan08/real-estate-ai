'use client';

import { Mic, MessageCircle, Phone, Globe } from 'lucide-react';
import { PageHeader } from '@/components/layout/dashboard-shell';
import { Alert } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Panel, PanelHeader } from '@/components/ui/panel';
import { AiEmployeeIdCard } from '@/features/ai-employee/ai-employee-card';
import { useAuth } from '@/features/auth/auth-provider';

const CHANNELS = [
  { icon: Globe, name: 'Website chat', detail: 'Answer enquiries on your website, day and night.' },
  { icon: MessageCircle, name: 'WhatsApp Business', detail: 'Reply to buyers through the official WhatsApp Business API.' },
  { icon: Phone, name: 'Phone calls', detail: 'Take incoming calls and make permitted follow-up calls.' },
];

export default function AiEmployeePage() {
  const tenantName = useAuth().session?.activeTenant?.name ?? '';
  return (
    <>
      <PageHeader title="AI Employee" description="The assistant that will talk to your buyers. Setup opens here when it launches." />
      <Alert tone="warning" title="Your AI employee is not configured or active" className="mb-6">
        This module is in development. Nothing here talks to customers yet, and no settings on this page are saved.
      </Alert>

      <AiEmployeeIdCard businessName={tenantName} />

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Panel>
          <PanelHeader title="Voice" description="Choose how your AI employee sounds on calls" />
          <ul className="divide-y divide-subtle px-5">
            {['Female voice', 'Male voice'].map((voice) => (
              <li key={voice} className="flex items-center gap-3 py-3.5 text-sm">
                <Mic className="size-4 text-fg-faint" aria-hidden />
                <span className="flex-1 font-medium text-fg-secondary">{voice}</span>
                <Badge>Available at launch</Badge>
              </li>
            ))}
          </ul>
        </Panel>
        <Panel>
          <PanelHeader title="Channels" description="Where your AI employee will work" />
          <ul className="divide-y divide-subtle px-5">
            {CHANNELS.map(({ icon: Icon, name, detail }) => (
              <li key={name} className="flex items-start gap-3 py-3.5">
                <Icon className="mt-0.5 size-4 text-fg-faint" aria-hidden />
                <div className="flex-1">
                  <p className="text-sm font-medium text-fg-secondary">{name}</p>
                  <p className="text-xs text-fg-muted">{detail}</p>
                </div>
                <Badge>Not connected</Badge>
              </li>
            ))}
          </ul>
        </Panel>
      </div>
    </>
  );
}
