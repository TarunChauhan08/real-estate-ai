'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  BUSINESS_TYPE_LABELS,
  type BusinessProfileDto,
  BusinessType,
  Permission,
  type TenantDto,
} from '@rea/shared-types';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';
import { ErrorState } from '@/components/states/states';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { Input, Select } from '@/components/ui/input';
import { Panel, PanelHeader } from '@/components/ui/panel';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/features/auth/auth-provider';
import { INDIAN_STATES } from '@/features/onboarding/reference-data';
import { usePermission } from '@/hooks/use-permission';
import { api, ApiError, applyFieldErrors } from '@/lib/api-client';
import { queryKeys } from '@/lib/query-keys';

const schema = z.object({
  name: z.string().trim().min(2, 'Enter your business name').max(120),
  businessType: z.nativeEnum(BusinessType),
  phone: z
    .string()
    .trim()
    .regex(/^(\+?[0-9][0-9 -]{5,18}[0-9])?$/, 'Enter a valid phone number'),
  website: z.string().trim().max(255),
  city: z.string().trim().max(100),
  state: z.string().trim().max(100),
});
type Values = z.infer<typeof schema>;

export function BusinessProfileTab() {
  const canEdit = usePermission(Permission.TENANT_UPDATE);
  const { reload } = useAuth();
  const queryClient = useQueryClient();
  const tenant = useQuery({
    queryKey: queryKeys.tenant,
    queryFn: () => api<TenantDto>('/tenants/current'),
  });
  const profile = useQuery({
    queryKey: queryKeys.profile,
    queryFn: () => api<BusinessProfileDto>('/tenants/current/profile'),
  });
  const form = useForm<Values>({ resolver: zodResolver(schema) });

  useEffect(() => {
    if (tenant.data && profile.data) {
      form.reset({
        name: tenant.data.name,
        businessType: profile.data.businessType,
        phone: profile.data.phone ?? '',
        website: profile.data.website ?? '',
        city: profile.data.city ?? '',
        state: profile.data.state ?? '',
      });
    }
  }, [tenant.data, profile.data, form]);

  const save = useMutation({
    mutationFn: async ({ name, ...rest }: Values) => {
      if (name !== tenant.data?.name)
        await api('/tenants/current', { method: 'PATCH', body: { name } });
      return api<BusinessProfileDto>('/tenants/current/profile', { method: 'PATCH', body: rest });
    },
    onSuccess: async () => {
      toast.success('Business profile saved');
      await queryClient.invalidateQueries({ queryKey: ['tenant'] });
      await queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      await reload();
    },
    onError: (error) => {
      if (!applyFieldErrors(error, form.setError)) {
        form.setError('root', {
          message: error instanceof ApiError ? error.message : 'Changes were not saved',
        });
      }
    },
  });

  if (tenant.isError || profile.isError)
    return <ErrorState error={tenant.error ?? profile.error} />;
  if (!tenant.data || !profile.data) return <Skeleton className="h-80" />;
  const { errors } = form.formState;

  return (
    <Panel>
      <PanelHeader
        title="Business profile"
        description="How your business appears to your team and, later, to buyers."
      />
      <form
        onSubmit={form.handleSubmit((v) => save.mutate(v))}
        noValidate
        className="space-y-5 p-5"
      >
        {!canEdit && (
          <Alert tone="info">Only owners and admins can edit the business profile.</Alert>
        )}
        {errors.root && <Alert tone="danger">{errors.root.message}</Alert>}
        <fieldset disabled={!canEdit} className="grid gap-5 sm:grid-cols-2">
          <Field label="Business name" error={errors.name?.message}>
            {(c) => <Input {...c} {...form.register('name')} />}
          </Field>
          <Field label="Business type" error={errors.businessType?.message}>
            {(c) => (
              <Select {...c} {...form.register('businessType')}>
                {Object.values(BusinessType).map((t) => (
                  <option key={t} value={t}>
                    {BUSINESS_TYPE_LABELS[t]}
                  </option>
                ))}
              </Select>
            )}
          </Field>
          <Field label="Phone" optional error={errors.phone?.message}>
            {(c) => <Input {...c} type="tel" {...form.register('phone')} />}
          </Field>
          <Field label="Website" optional error={errors.website?.message}>
            {(c) => <Input {...c} {...form.register('website')} />}
          </Field>
          <Field label="City" optional error={errors.city?.message}>
            {(c) => <Input {...c} {...form.register('city')} />}
          </Field>
          <Field label="State" optional error={errors.state?.message}>
            {(c) => (
              <Select {...c} {...form.register('state')}>
                <option value="">Not set</option>
                {INDIAN_STATES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </Select>
            )}
          </Field>
        </fieldset>
        <div className="flex items-center justify-between border-t border-subtle pt-4 text-xs text-fg-muted">
          <span>Business ID: {tenant.data.slug}</span>
          {canEdit && (
            <Button type="submit" loading={save.isPending} disabled={!form.formState.isDirty}>
              Save changes
            </Button>
          )}
        </div>
      </form>
    </Panel>
  );
}
