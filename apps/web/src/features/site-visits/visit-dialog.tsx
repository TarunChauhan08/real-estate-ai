'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  type BuyerNotification,
  type CreateSiteVisitRequest,
  type MemberDto,
  type PropertyDto,
  type SiteVisitDto,
  type SiteVisitResultDto,
  type UpdateSiteVisitRequest,
} from '@rea/shared-types';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Input, Select, Textarea } from '@/components/ui/input';
import { api, ApiError, apiPage } from '@/lib/api-client';
import { queryKeys } from '@/lib/query-keys';

export type VisitDialogMode =
  | { kind: 'book'; leadId: string; leadName: string }
  | { kind: 'confirm'; visit: SiteVisitDto }
  | { kind: 'reschedule'; visit: SiteVisitDto };

/** `datetime-local` value (in the browser's time zone) ↔ ISO string. */
function toLocalInput(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** Tomorrow at 11:00, a sensible default slot. */
function defaultSlot(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  d.setHours(11, 0, 0, 0);
  return toLocalInput(d.toISOString());
}

/** Tells the person what happened to the buyer message, in plain words. */
export function announce(notification: BuyerNotification | null, done: string): void {
  if (!notification) toast.success(done);
  else if (notification.sent) toast.success(`${done} · buyer told on WhatsApp`);
  else
    toast.warning(`${done}. The buyer was not messaged: ${notification.reason}`, {
      duration: 9000,
    });
}

export function VisitDialog({
  mode,
  onOpenChange,
}: {
  mode: VisitDialogMode | null;
  onOpenChange: (open: boolean) => void;
}) {
  const queryClient = useQueryClient();
  const visit = mode && mode.kind !== 'book' ? mode.visit : null;
  const [when, setWhen] = useState('');
  const [propertyId, setPropertyId] = useState('');
  const [assignedToId, setAssignedToId] = useState('');
  const [notes, setNotes] = useState('');
  const [notifyBuyer, setNotifyBuyer] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!mode) return;
    setWhen(visit?.scheduledAt ? toLocalInput(visit.scheduledAt) : defaultSlot());
    setPropertyId(visit?.property?.id ?? '');
    setAssignedToId(visit?.assignedTo?.id ?? '');
    setNotes(visit?.notes ?? '');
    setNotifyBuyer(true);
    setError(null);
  }, [mode, visit]);

  const properties = useQuery({
    queryKey: queryKeys.properties('status=AVAILABLE&pageSize=100'),
    queryFn: () => apiPage<PropertyDto>('/properties?status=AVAILABLE&pageSize=100'),
    enabled: mode !== null,
  });
  const members = useQuery({
    queryKey: queryKeys.activeMembers,
    queryFn: () => apiPage<MemberDto>('/tenants/current/members?status=ACTIVE&pageSize=100'),
    enabled: mode !== null,
  });

  const save = useMutation({
    mutationFn: () => {
      const scheduledAt = new Date(when).toISOString();
      const common = {
        propertyId: propertyId || undefined,
        assignedToId: assignedToId || undefined,
        notes: notes.trim() || undefined,
        notifyBuyer,
      };
      if (mode?.kind === 'book') {
        return api<SiteVisitResultDto>('/site-visits', {
          method: 'POST',
          body: { leadId: mode.leadId, scheduledAt, ...common } satisfies CreateSiteVisitRequest,
        });
      }
      return api<SiteVisitResultDto>(`/site-visits/${visit!.id}`, {
        method: 'PATCH',
        body: {
          status: 'CONFIRMED',
          scheduledAt,
          propertyId: propertyId || null,
          assignedToId: assignedToId || null,
          notes: notes.trim() || null,
          notifyBuyer,
        } satisfies UpdateSiteVisitRequest,
      });
    },
    onSuccess: (result) => {
      void queryClient.invalidateQueries({ queryKey: ['site-visits'] });
      void queryClient.invalidateQueries({ queryKey: ['leads'] });
      void queryClient.invalidateQueries({ queryKey: ['conversations'] });
      void queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      announce(
        result.notification,
        mode?.kind === 'reschedule' ? 'Visit rescheduled' : 'Visit confirmed',
      );
      onOpenChange(false);
    },
    onError: (e) => setError(e instanceof ApiError ? e.message : 'The visit was not saved'),
  });

  const title =
    mode?.kind === 'book'
      ? `Book a site visit for ${mode.leadName}`
      : mode?.kind === 'reschedule'
        ? `Reschedule ${mode.visit.lead.name}'s visit`
        : `Confirm ${visit?.lead.name ?? ''}'s visit`;

  return (
    <Dialog open={mode !== null} onOpenChange={onOpenChange}>
      <DialogContent
        title={title}
        description={
          visit?.requestedSlot && mode?.kind === 'confirm'
            ? `The buyer asked for: “${visit.requestedSlot}”`
            : 'Pick an exact date and time.'
        }
      >
        <form
          noValidate
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (!when || Number.isNaN(new Date(when).getTime())) {
              setError('Pick a date and time');
              return;
            }
            setError(null);
            save.mutate();
          }}
        >
          {error && <Alert tone="danger">{error}</Alert>}
          <div className="space-y-1.5">
            <label htmlFor="visit-when" className="text-sm font-medium text-fg-secondary">
              Date and time
            </label>
            <Input
              id="visit-when"
              type="datetime-local"
              value={when}
              onChange={(e) => setWhen(e.target.value)}
              required
            />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="visit-property" className="text-sm font-medium text-fg-secondary">
              Property <span className="font-normal text-fg-muted">(optional)</span>
            </label>
            <Select
              id="visit-property"
              value={propertyId}
              onChange={(e) => setPropertyId(e.target.value)}
            >
              <option value="">Not decided yet</option>
              {properties.data?.data.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.title}
                  {p.locality ? ` · ${p.locality}` : ''}
                </option>
              ))}
              {visit?.property &&
                !properties.data?.data.some((p) => p.id === visit.property!.id) && (
                  <option value={visit.property.id}>{visit.property.title}</option>
                )}
            </Select>
          </div>
          <div className="space-y-1.5">
            <label htmlFor="visit-assignee" className="text-sm font-medium text-fg-secondary">
              Who will show it <span className="font-normal text-fg-muted">(optional)</span>
            </label>
            <Select
              id="visit-assignee"
              value={assignedToId}
              onChange={(e) => setAssignedToId(e.target.value)}
            >
              <option value="">Not assigned</option>
              {members.data?.data.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </Select>
          </div>
          <div className="space-y-1.5">
            <label htmlFor="visit-notes" className="text-sm font-medium text-fg-secondary">
              Notes for the team <span className="font-normal text-fg-muted">(optional)</span>
            </label>
            <Textarea
              id="visit-notes"
              rows={2}
              maxLength={1000}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Parking at gate 2, bring the floor plan…"
            />
          </div>
          <label className="flex items-start gap-2.5 text-sm text-fg-secondary">
            <input
              type="checkbox"
              className="mt-0.5 size-4 accent-[var(--color-brand)]"
              checked={notifyBuyer}
              onChange={(e) => setNotifyBuyer(e.target.checked)}
            />
            <span>
              Tell the buyer on WhatsApp
              <span className="block text-xs text-fg-muted">
                Only possible within 24 hours of their last WhatsApp message. Otherwise you will be
                reminded to call them.
              </span>
            </span>
          </label>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={save.isPending}>
              {mode?.kind === 'book'
                ? 'Book visit'
                : mode?.kind === 'reschedule'
                  ? 'Save new time'
                  : 'Confirm visit'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
