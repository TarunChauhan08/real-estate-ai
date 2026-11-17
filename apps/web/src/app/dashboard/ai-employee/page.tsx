'use client';

import { Permission } from '@rea/shared-types';
import { Globe, MessageCircle, Phone } from 'lucide-react';
import { PageHeader } from '@/components/layout/dashboard-shell';
import { Badge } from '@/components/ui/badge';
import { Panel, PanelHeader } from '@/components/ui/panel';
import { AiEmployeeIdCard } from '@/features/ai-employee/ai-employee-card';
import { useAuth } from '@/features/auth/auth-provider';
import { StartTestChat } from '@/features/conversations/start-test-chat';
import { usePermission } from '@/hooks/use-permission';

const CHANNELS = [
  {
    icon: Globe,
    name: 'Test chat',
    detail: 'Chat with your AI employee from this dashboard, as any buyer.',
    status: <Badge tone="success">Available</Badge>,
  },
  {
    icon: MessageCircle,
    name: 'WhatsApp Business',
    detail: 'Reply to buyers through the official WhatsApp Business API.',
    status: <Badge tone="warning">Next release</Badge>,
  },
  {
    icon: Phone,
    name: 'Phone calls',
    detail: 'Answer incoming calls and make permitted follow-up calls.',
    status: <Badge>Planned</Badge>,
  },
];

export default function AiEmployeePage() {
  const tenantName = useAuth().session?.activeTenant?.name ?? '';
  const canWriteConversations = usePermission(Permission.CONVERSATIONS_WRITE);
  const canWriteLeads = usePermission(Permission.LEADS_WRITE);
  const canChat = canWriteConversations && canWriteLeads;
  return (
    <>
      <PageHeader
        title="AI Employee"
        description="Your AI sales employee replies from your own listings and fills in the lead as it learns. Test it here before any buyer sees it."
      />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <div className="space-y-6">
          <AiEmployeeIdCard businessName={tenantName} />
          <Panel>
            <PanelHeader title="Channels" description="Where your AI employee works" />
            <ul className="divide-y divide-subtle px-5">
              {CHANNELS.map(({ icon: Icon, name, detail, status }) => (
                <li key={name} className="flex items-start gap-3 py-3.5">
                  <Icon className="mt-0.5 size-4 text-brand-fg" aria-hidden />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-fg">{name}</p>
                    <p className="text-xs text-fg-muted">{detail}</p>
                  </div>
                  {status}
                </li>
              ))}
            </ul>
          </Panel>
        </div>
        {canChat ? (
          <StartTestChat />
        ) : (
          <Panel className="p-6 text-sm text-fg-muted">
            Your role can read conversations but cannot start test chats.
          </Panel>
        )}
      </div>
    </>
  );
}
