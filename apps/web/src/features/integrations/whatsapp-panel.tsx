'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  type ConnectWhatsAppRequest,
  Permission,
  type SimulateWhatsAppResultDto,
  type WhatsAppStatusDto,
} from '@rea/shared-types';
import { CheckCircle2, FlaskConical, MessageCircle, Send, Unplug } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';
import { ErrorState } from '@/components/states/states';
import { Alert } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Field } from '@/components/ui/field';
import { Input, Textarea } from '@/components/ui/input';
import { Panel, PanelHeader } from '@/components/ui/panel';
import { Skeleton } from '@/components/ui/skeleton';
import { usePermission } from '@/hooks/use-permission';
import { api, ApiError, applyFieldErrors } from '@/lib/api-client';
import { API_URL } from '@/lib/env';
import { queryKeys } from '@/lib/query-keys';
import { formatDateTime } from '@/lib/utils';

const metaId = z
  .string()
  .trim()
  .regex(/^\d{5,32}$/, 'Digits only — copy it from Meta’s API Setup page');

const connectSchema = z.object({
  phoneNumberId: metaId,
  wabaId: z.union([metaId, z.literal('')]),
  displayPhoneNumber: z
    .string()
    .trim()
    .regex(/^[+\d][\d\s-]{7,18}$/, 'Enter the WhatsApp number, e.g. 98765 43210'),
  accessToken: z
    .string()
    .trim()
    .min(8, 'Paste the permanent access token')
    .regex(/^\S+$/, 'The token cannot contain spaces'),
});
type ConnectValues = z.infer<typeof connectSchema>;

const simulateSchema = z.object({
  from: z
    .string()
    .trim()
    .regex(/^[+\d][\d\s-]{7,18}$/, 'Enter a mobile number, e.g. 98765 43210'),
  name: z.string().trim().max(120),
  text: z.string().trim().min(1, 'Type a message').max(2000),
});
type SimulateValues = z.infer<typeof simulateSchema>;

const SETUP_STEPS = [
  'In Meta Business Manager, add your WhatsApp Business number to the Cloud API.',
  'Create a System User with the whatsapp_business_messaging permission and generate a permanent token.',
  'Copy the Phone number ID and WhatsApp Business Account ID from WhatsApp → API Setup.',
  'Paste them below. We check the token with WhatsApp before saving it, encrypted.',
];

function ConnectForm({ onDone }: { onDone: () => void }) {
  const queryClient = useQueryClient();
  const form = useForm<ConnectValues>({
    resolver: zodResolver(connectSchema),
    defaultValues: { phoneNumberId: '', wabaId: '', displayPhoneNumber: '', accessToken: '' },
  });
  const connect = useMutation({
    mutationFn: (v: ConnectValues) =>
      api<WhatsAppStatusDto>('/channels/whatsapp', {
        method: 'PUT',
        body: {
          phoneNumberId: v.phoneNumberId,
          displayPhoneNumber: v.displayPhoneNumber,
          accessToken: v.accessToken,
          ...(v.wabaId ? { wabaId: v.wabaId } : {}),
        } satisfies ConnectWhatsAppRequest,
      }),
    onSuccess: (status) => {
      queryClient.setQueryData(queryKeys.whatsapp, status);
      toast.success('WhatsApp connected');
      onDone();
    },
    onError: (error) => {
      if (!applyFieldErrors(error, form.setError)) {
        form.setError('root', {
          message: error instanceof ApiError ? error.message : 'Could not connect WhatsApp',
        });
      }
    },
  });

  return (
    <form noValidate className="space-y-4" onSubmit={form.handleSubmit((v) => connect.mutate(v))}>
      {form.formState.errors.root && (
        <Alert tone="danger">{form.formState.errors.root.message}</Alert>
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Phone number ID" error={form.formState.errors.phoneNumberId?.message}>
          {(c) => (
            <Input
              {...c}
              inputMode="numeric"
              placeholder="106540352242922"
              {...form.register('phoneNumberId')}
            />
          )}
        </Field>
        <Field
          label="WhatsApp Business Account ID"
          optional
          error={form.formState.errors.wabaId?.message}
        >
          {(c) => (
            <Input
              {...c}
              inputMode="numeric"
              placeholder="102290129340398"
              {...form.register('wabaId')}
            />
          )}
        </Field>
      </div>
      <Field
        label="WhatsApp number buyers message"
        error={form.formState.errors.displayPhoneNumber?.message}
      >
        {(c) => (
          <Input
            {...c}
            type="tel"
            inputMode="tel"
            placeholder="98765 43210"
            {...form.register('displayPhoneNumber')}
          />
        )}
      </Field>
      <Field
        label="Permanent access token"
        error={form.formState.errors.accessToken?.message}
        hint="Stored encrypted. It is never shown again, not even to you."
      >
        {(c) => (
          <Input
            {...c}
            type="password"
            autoComplete="off"
            spellCheck={false}
            placeholder="EAAG…"
            {...form.register('accessToken')}
          />
        )}
      </Field>
      <Button type="submit" className="w-full" loading={connect.isPending}>
        Check and connect
      </Button>
    </form>
  );
}

/** Demo mode only: send a message as if a buyer wrote to the business on WhatsApp. */
function Simulator() {
  const router = useRouter();
  const form = useForm<SimulateValues>({
    resolver: zodResolver(simulateSchema),
    defaultValues: { from: '', name: '', text: 'Hi, Noida mein 2 BHK chahiye, budget 70 lakh.' },
  });
  const simulate = useMutation({
    mutationFn: (v: SimulateValues) =>
      api<SimulateWhatsAppResultDto>('/channels/whatsapp/simulate', {
        method: 'POST',
        body: { from: v.from, text: v.text, ...(v.name ? { name: v.name } : {}) },
      }),
    onSuccess: (result) => router.push(`/dashboard/conversations?id=${result.conversationId}`),
    onError: (error) => {
      if (!applyFieldErrors(error, form.setError)) {
        form.setError('root', {
          message: error instanceof ApiError ? error.message : 'Could not send the test message',
        });
      }
    },
  });

  return (
    <Panel>
      <PanelHeader
        title="Try it like a buyer"
        description="Sends a pretend WhatsApp message through the real pipeline: lead, AI reply, inbox."
      />
      <form
        noValidate
        className="space-y-4 p-5"
        onSubmit={form.handleSubmit((v) => simulate.mutate(v))}
      >
        {form.formState.errors.root && (
          <Alert tone="danger">{form.formState.errors.root.message}</Alert>
        )}
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Buyer’s WhatsApp number" error={form.formState.errors.from?.message}>
            {(c) => (
              <Input
                {...c}
                type="tel"
                inputMode="tel"
                placeholder="98765 43210"
                {...form.register('from')}
              />
            )}
          </Field>
          <Field label="Profile name" optional>
            {(c) => <Input {...c} placeholder="Priya Verma" {...form.register('name')} />}
          </Field>
        </div>
        <Field label="Message" error={form.formState.errors.text?.message}>
          {(c) => <Textarea {...c} rows={2} {...form.register('text')} />}
        </Field>
        <Button type="submit" loading={simulate.isPending}>
          {!simulate.isPending && <Send />} Send as buyer
        </Button>
      </form>
    </Panel>
  );
}

export function WhatsAppPanel() {
  const queryClient = useQueryClient();
  const canManage = usePermission(Permission.CHANNELS_MANAGE);
  const canChat = usePermission(Permission.CONVERSATIONS_WRITE);
  const [editing, setEditing] = useState(false);
  const [confirmDisconnect, setConfirmDisconnect] = useState(false);

  const status = useQuery({
    queryKey: queryKeys.whatsapp,
    queryFn: () => api<WhatsAppStatusDto>('/channels/whatsapp'),
  });
  const disconnect = useMutation({
    mutationFn: () => api<WhatsAppStatusDto>('/channels/whatsapp', { method: 'DELETE' }),
    onSuccess: (s) => {
      queryClient.setQueryData(queryKeys.whatsapp, s);
      setConfirmDisconnect(false);
      toast.success('WhatsApp disconnected. Conversations are kept.');
    },
    onError: (error) =>
      toast.error(error instanceof ApiError ? error.message : 'Could not disconnect'),
  });

  if (status.isError)
    return <ErrorState error={status.error} onRetry={() => void status.refetch()} />;
  if (!status.data) return <Skeleton className="h-72" />;

  const { account, provider, simulatorEnabled } = status.data;
  const demo = provider === 'fake';

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
      <div className="space-y-6">
        <Panel>
          <PanelHeader
            title="WhatsApp Business"
            description="Your AI employee answers buyers on your official WhatsApp number, 24×7."
            actions={
              account ? (
                <Badge tone="success">
                  <CheckCircle2 className="size-3" aria-hidden /> Connected
                </Badge>
              ) : (
                <Badge>Not connected</Badge>
              )
            }
          />
          <div className="space-y-5 p-5">
            {demo && (
              <Alert tone="warning" title="Demo mode">
                Replies are recorded in your inbox but not sent to real phones. Your platform
                administrator switches this on with <code>WHATSAPP_PROVIDER=cloud</code>.
              </Alert>
            )}

            {account && !editing ? (
              <>
                <dl className="grid gap-4 text-sm sm:grid-cols-2">
                  <div>
                    <dt className="text-xs text-fg-muted">WhatsApp number</dt>
                    <dd className="mt-0.5 font-semibold text-fg">{account.displayPhoneNumber}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-fg-muted">Phone number ID</dt>
                    <dd className="mt-0.5 font-mono text-fg">{account.phoneNumberId}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-fg-muted">Connected</dt>
                    <dd className="mt-0.5 text-fg">{formatDateTime(account.connectedAt)}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-fg-muted">Last buyer message</dt>
                    <dd className="mt-0.5 text-fg">
                      {account.lastInboundAt ? formatDateTime(account.lastInboundAt) : 'None yet'}
                    </dd>
                  </div>
                </dl>
                {canManage && (
                  <div className="flex flex-wrap gap-2 border-t border-line pt-4">
                    <Button variant="secondary" size="sm" onClick={() => setEditing(true)}>
                      Replace number or token
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => setConfirmDisconnect(true)}>
                      <Unplug /> Disconnect
                    </Button>
                  </div>
                )}
              </>
            ) : canManage ? (
              <>
                <ol className="space-y-2 text-sm text-fg-secondary">
                  {SETUP_STEPS.map((step, i) => (
                    <li key={step} className="flex gap-3">
                      <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-brand-soft text-[11px] font-bold text-brand-fg">
                        {i + 1}
                      </span>
                      {step}
                    </li>
                  ))}
                </ol>
                <ConnectForm onDone={() => setEditing(false)} />
                {editing && (
                  <Button variant="ghost" size="sm" onClick={() => setEditing(false)}>
                    Cancel
                  </Button>
                )}
              </>
            ) : (
              <p className="text-sm text-fg-muted">
                WhatsApp is not connected yet. Ask an owner or admin to connect your business
                number.
              </p>
            )}
          </div>
        </Panel>

        {canManage && (
          <details className="rounded-[var(--radius-panel)] border border-line bg-white px-5 py-4 text-sm shadow-[var(--shadow-soft)]">
            <summary className="cursor-pointer font-semibold text-fg">
              Webhook details for your platform administrator
            </summary>
            <p className="mt-3 text-fg-muted">
              In the Meta app, subscribe the <code>messages</code> field to this callback URL, using
              the server’s <code>WHATSAPP_VERIFY_TOKEN</code>:
            </p>
            <p className="mt-2 break-all rounded-md bg-canvas px-3 py-2 font-mono text-xs text-fg">
              {`${API_URL}/webhooks/whatsapp`}
            </p>
          </details>
        )}
      </div>

      <div className="space-y-6">
        {account && simulatorEnabled && canChat ? (
          <Simulator />
        ) : (
          <Panel className="p-6">
            <MessageCircle className="size-6 text-gold-deep" aria-hidden />
            <h2 className="mt-3 font-semibold text-fg">What happens when a buyer writes</h2>
            <ul className="mt-3 space-y-2 text-sm text-fg-secondary">
              <li>A lead is created (or matched) from their WhatsApp number and name.</li>
              <li>The AI replies within seconds in their language, from your real listings.</li>
              <li>Budget, city, BHK and timeline fill in on the lead automatically.</li>
              <li>Discounts, legal questions and complaints are handed to your team.</li>
              <li>Your team can pause the AI and reply on WhatsApp from the inbox.</li>
            </ul>
            {account && demo && !simulatorEnabled && (
              <p className="mt-4 flex items-center gap-2 text-xs text-fg-muted">
                <FlaskConical className="size-3.5" /> The simulator is off on this server.
              </p>
            )}
          </Panel>
        )}
      </div>

      <Dialog open={confirmDisconnect} onOpenChange={setConfirmDisconnect}>
        <DialogContent
          title="Disconnect WhatsApp?"
          description="Buyers who message your number will no longer get AI replies. Existing conversations stay in your inbox."
        >
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setConfirmDisconnect(false)}>
              Keep connected
            </Button>
            <Button
              variant="danger"
              loading={disconnect.isPending}
              onClick={() => disconnect.mutate()}
            >
              Disconnect
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
