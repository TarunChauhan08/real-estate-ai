'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery } from '@tanstack/react-query';
import {
  BUSINESS_TYPE_LABELS,
  type BusinessProfileDto,
  BusinessType,
  LANGUAGE_LABELS,
  PreferredLanguage,
  type TenantSettingsDto,
} from '@rea/shared-types';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';
import { ErrorState } from '@/components/states/states';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { Input, Select } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/features/auth/auth-provider';
import { api, ApiError, applyFieldErrors } from '@/lib/api-client';
import { queryKeys } from '@/lib/query-keys';
import { INDIAN_STATES, TIMEZONES } from './reference-data';

const schema = z.object({
  businessName: z.string().trim().min(2, 'Enter your business name').max(120),
  businessType: z.nativeEnum(BusinessType),
  phone: z
    .string()
    .trim()
    .regex(/^(\+?[0-9][0-9 -]{5,18}[0-9])?$/, 'Enter a valid phone number'),
  website: z.string().trim().max(255),
  city: z.string().trim().min(2, 'Enter your city').max(100),
  state: z.string().trim().min(2, 'Choose your state').max(100),
  timezone: z.string().min(1),
  preferredLanguage: z.nativeEnum(PreferredLanguage),
});
type Values = z.infer<typeof schema>;

export function OnboardingForm() {
  const { session, reload } = useAuth();
  const router = useRouter();
  const [formError, setFormError] = useState<string | null>(null);
  const profile = useQuery({ queryKey: queryKeys.profile, queryFn: () => api<BusinessProfileDto>('/tenants/current/profile') });
  const settings = useQuery({ queryKey: queryKeys.settings, queryFn: () => api<TenantSettingsDto>('/tenants/current/settings') });
  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<Values>({ resolver: zodResolver(schema) });

  useEffect(() => {
    if (profile.data && settings.data && session?.activeTenant) {
      reset({
        businessName: session.activeTenant.name,
        businessType: profile.data.businessType,
        phone: profile.data.phone ?? '',
        website: profile.data.website ?? '',
        city: profile.data.city ?? '',
        state: profile.data.state ?? '',
        timezone: settings.data.timezone,
        preferredLanguage: settings.data.preferredLanguage,
      });
    }
  }, [profile.data, settings.data, session?.activeTenant, reset]);

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    try {
      await api('/tenants/current/onboarding', { method: 'POST', body: values });
      await reload();
      toast.success('Business profile saved');
      router.replace('/dashboard');
    } catch (error) {
      if (!applyFieldErrors(error, setError)) {
        setFormError(error instanceof ApiError ? error.message : 'Could not save your details. Try again.');
      }
    }
  });

  if (profile.isError || settings.isError) {
    return <ErrorState error={profile.error ?? settings.error} onRetry={() => void Promise.all([profile.refetch(), settings.refetch()])} />;
  }
  if (!profile.data || !settings.data) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 6 }, (_, i) => (
          <Skeleton key={i} className="h-10" />
        ))}
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-8">
      {formError && <Alert tone="danger">{formError}</Alert>}

      <fieldset className="space-y-5">
        <legend className="text-[15px] font-semibold text-fg">Business</legend>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Business name" error={errors.businessName?.message}>
            {(c) => <Input {...c} {...register('businessName')} />}
          </Field>
          <Field label="Business type" error={errors.businessType?.message}>
            {(c) => (
              <Select {...c} {...register('businessType')}>
                {Object.values(BusinessType).map((t) => (
                  <option key={t} value={t}>
                    {BUSINESS_TYPE_LABELS[t]}
                  </option>
                ))}
              </Select>
            )}
          </Field>
          <Field label="Phone" optional error={errors.phone?.message}>
            {(c) => <Input {...c} type="tel" autoComplete="tel" placeholder="+91 98765 43210" {...register('phone')} />}
          </Field>
          <Field label="Website" optional error={errors.website?.message}>
            {(c) => <Input {...c} autoComplete="url" placeholder="yourbusiness.in" {...register('website')} />}
          </Field>
          <Field label="City" error={errors.city?.message}>
            {(c) => <Input {...c} autoComplete="address-level2" {...register('city')} />}
          </Field>
          <Field label="State" error={errors.state?.message}>
            {(c) => (
              <Select {...c} {...register('state')}>
                <option value="">Choose…</option>
                {INDIAN_STATES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </Select>
            )}
          </Field>
        </div>
      </fieldset>

      <fieldset className="space-y-5">
        <legend className="text-[15px] font-semibold text-fg">Preferences</legend>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Time zone" error={errors.timezone?.message}>
            {(c) => (
              <Select {...c} {...register('timezone')}>
                {TIMEZONES.map((tz) => (
                  <option key={tz.value} value={tz.value}>
                    {tz.label}
                  </option>
                ))}
              </Select>
            )}
          </Field>
          <Field
            label="Preferred language"
            hint="The default language your AI employee will use with buyers."
            error={errors.preferredLanguage?.message}
          >
            {(c) => (
              <Select {...c} {...register('preferredLanguage')}>
                {Object.values(PreferredLanguage).map((code) => (
                  <option key={code} value={code}>
                    {LANGUAGE_LABELS[code]}
                  </option>
                ))}
              </Select>
            )}
          </Field>
        </div>
      </fieldset>

      <Button type="submit" size="lg" loading={isSubmitting}>
        Save and continue
      </Button>
    </form>
  );
}
