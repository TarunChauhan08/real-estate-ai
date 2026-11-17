'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  LEAD_SOURCE_LABELS,
  LEAD_TEMPERATURE_LABELS,
  type LeadDto,
  LeadSource,
  LeadTemperature,
  PURCHASE_TIMELINE_LABELS,
  PurchaseTimeline,
} from '@rea/shared-types';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Field } from '@/components/ui/field';
import { Input, Select, Textarea } from '@/components/ui/input';
import { api, ApiError, applyFieldErrors } from '@/lib/api-client';
import { parseRupees } from './format';

const money = z
  .string()
  .trim()
  .refine((v) => {
    const n = parseRupees(v);
    return n === null || (!Number.isNaN(n) && n >= 0);
  }, 'Enter an amount like 60 lakh or 1.2 cr');

const schema = z
  .object({
    name: z.string().trim().min(2, 'Enter the buyer’s name').max(120),
    phone: z
      .string()
      .trim()
      .regex(/^[+\d][\d\s-]{7,18}$/, 'Enter a mobile number, e.g. 98765 43210'),
    email: z
      .string()
      .trim()
      .max(254)
      .refine((v) => v === '' || z.string().email().safeParse(v).success, 'Enter a valid email'),
    source: z.string(),
    temperature: z.string(),
    budgetMin: money,
    budgetMax: money,
    preferredCity: z.string().trim().max(100),
    preferredLocalities: z.string(),
    preferredBedrooms: z
      .string()
      .trim()
      .refine(
        (v) => v === '' || /^\d{1,2}(\s*,\s*\d{1,2})*$/.test(v),
        'Use numbers separated by commas, e.g. 2, 3',
      ),
    purpose: z.string(),
    timeline: z.string(),
    needsHomeLoan: z.string(),
    preferredLanguage: z.string(),
    notes: z.string().trim().max(5000),
  })
  .superRefine((v, ctx) => {
    const min = parseRupees(v.budgetMin);
    const max = parseRupees(v.budgetMax);
    if (min && max && min > max) {
      ctx.addIssue({
        code: 'custom',
        path: ['budgetMax'],
        message: 'Maximum must be at least the minimum',
      });
    }
  });
type Values = z.infer<typeof schema>;

const nullable = (v: string) => (v.trim() === '' ? null : v.trim());

function toDefaults(lead?: LeadDto): Values {
  return {
    name: lead?.name ?? '',
    phone: lead?.phone ?? '',
    email: lead?.email ?? '',
    source: lead?.source ?? LeadSource.MANUAL,
    temperature: lead?.temperature ?? LeadTemperature.UNSCORED,
    budgetMin: lead?.budgetMin?.toString() ?? '',
    budgetMax: lead?.budgetMax?.toString() ?? '',
    preferredCity: lead?.preferredCity ?? '',
    preferredLocalities: lead?.preferredLocalities.join(', ') ?? '',
    preferredBedrooms: lead?.preferredBedrooms.join(', ') ?? '',
    purpose: lead?.purpose ?? '',
    timeline: lead?.timeline ?? '',
    needsHomeLoan:
      lead?.needsHomeLoan === null || lead?.needsHomeLoan === undefined
        ? ''
        : String(lead.needsHomeLoan),
    preferredLanguage: lead?.preferredLanguage ?? '',
    notes: lead?.notes ?? '',
  };
}

export function LeadFormDialog({
  lead,
  open,
  onOpenChange,
  onSaved,
}: {
  lead?: LeadDto;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved?: (lead: LeadDto) => void;
}) {
  const queryClient = useQueryClient();
  const form = useForm<Values>({ resolver: zodResolver(schema), values: toDefaults(lead) });
  const mutation = useMutation({
    mutationFn: (v: Values) => {
      const body = {
        name: v.name,
        phone: v.phone,
        email: nullable(v.email),
        source: v.source,
        temperature: v.temperature,
        budgetMin: parseRupees(v.budgetMin),
        budgetMax: parseRupees(v.budgetMax),
        preferredCity: nullable(v.preferredCity),
        preferredLocalities: v.preferredLocalities
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean),
        preferredBedrooms: v.preferredBedrooms
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean)
          .map(Number),
        purpose: nullable(v.purpose),
        timeline: nullable(v.timeline),
        needsHomeLoan: v.needsHomeLoan === '' ? null : v.needsHomeLoan === 'true',
        preferredLanguage: nullable(v.preferredLanguage),
        notes: nullable(v.notes),
      };
      return lead
        ? api<LeadDto>(`/leads/${lead.id}`, { method: 'PATCH', body })
        : api<LeadDto>('/leads', { method: 'POST', body });
    },
    onSuccess: (saved) => {
      toast.success(lead ? 'Lead updated' : `${saved.name} added to your leads`);
      void queryClient.invalidateQueries({ queryKey: ['leads'] });
      void queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      onOpenChange(false);
      onSaved?.(saved);
    },
    onError: (error) => {
      if (!applyFieldErrors(error, form.setError)) {
        form.setError('root', {
          message: error instanceof ApiError ? error.message : 'The lead was not saved',
        });
      }
    },
  });
  const e = form.formState.errors;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        title={lead ? 'Edit lead' : 'Add a lead'}
        description="Phone numbers are unique per business, so the same buyer is never added twice."
        className="max-h-[92vh] max-w-2xl overflow-y-auto"
      >
        <form
          noValidate
          className="space-y-5"
          onSubmit={form.handleSubmit((v) => mutation.mutate(v))}
        >
          {e.root && <Alert tone="danger">{e.root.message}</Alert>}
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Name" error={e.name?.message}>
              {(c) => <Input {...c} autoComplete="off" {...form.register('name')} />}
            </Field>
            <Field label="Mobile number" error={e.phone?.message}>
              {(c) => <Input {...c} type="tel" inputMode="tel" {...form.register('phone')} />}
            </Field>
            <Field label="Email" optional error={e.email?.message}>
              {(c) => <Input {...c} type="email" {...form.register('email')} />}
            </Field>
            <Field label="Source">
              {(c) => (
                <Select {...c} {...form.register('source')}>
                  {Object.values(LeadSource).map((s) => (
                    <option key={s} value={s}>
                      {LEAD_SOURCE_LABELS[s]}
                    </option>
                  ))}
                </Select>
              )}
            </Field>
            <Field label="Budget from" optional error={e.budgetMin?.message} hint="e.g. 60 lakh">
              {(c) => <Input {...c} {...form.register('budgetMin')} />}
            </Field>
            <Field label="Budget up to" optional error={e.budgetMax?.message} hint="e.g. 1.2 cr">
              {(c) => <Input {...c} {...form.register('budgetMax')} />}
            </Field>
            <Field label="City" optional>
              {(c) => <Input {...c} {...form.register('preferredCity')} />}
            </Field>
            <Field label="Localities" optional hint="Comma separated">
              {(c) => <Input {...c} {...form.register('preferredLocalities')} />}
            </Field>
            <Field label="BHK" optional error={e.preferredBedrooms?.message} hint="e.g. 2, 3">
              {(c) => <Input {...c} {...form.register('preferredBedrooms')} />}
            </Field>
            <Field label="Lead score">
              {(c) => (
                <Select {...c} {...form.register('temperature')}>
                  {Object.values(LeadTemperature).map((t) => (
                    <option key={t} value={t}>
                      {LEAD_TEMPERATURE_LABELS[t]}
                    </option>
                  ))}
                </Select>
              )}
            </Field>
            <Field label="Purpose" optional>
              {(c) => (
                <Select {...c} {...form.register('purpose')}>
                  <option value="">Not known</option>
                  <option value="SELF_USE">Self use</option>
                  <option value="INVESTMENT">Investment</option>
                </Select>
              )}
            </Field>
            <Field label="Timeline" optional>
              {(c) => (
                <Select {...c} {...form.register('timeline')}>
                  <option value="">Not known</option>
                  {Object.values(PurchaseTimeline).map((t) => (
                    <option key={t} value={t}>
                      {PURCHASE_TIMELINE_LABELS[t]}
                    </option>
                  ))}
                </Select>
              )}
            </Field>
            <Field label="Home loan" optional>
              {(c) => (
                <Select {...c} {...form.register('needsHomeLoan')}>
                  <option value="">Not known</option>
                  <option value="true">Needs a loan</option>
                  <option value="false">No loan needed</option>
                </Select>
              )}
            </Field>
            <Field label="Language" optional>
              {(c) => (
                <Select {...c} {...form.register('preferredLanguage')}>
                  <option value="">Not known</option>
                  <option value="en">English</option>
                  <option value="hi">Hindi</option>
                  <option value="hinglish">Hinglish</option>
                </Select>
              )}
            </Field>
          </div>
          <Field label="Notes" optional>
            {(c) => <Textarea {...c} rows={3} {...form.register('notes')} />}
          </Field>
          <div className="flex justify-end gap-2 border-t border-line pt-4">
            <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={mutation.isPending}>
              {lead ? 'Save changes' : 'Add lead'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
