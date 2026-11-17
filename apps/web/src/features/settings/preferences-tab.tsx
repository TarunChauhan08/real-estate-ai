'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  LANGUAGE_LABELS,
  Permission,
  PreferredLanguage,
  SUPPORTED_CURRENCIES,
  SUPPORTED_LOCALES,
  type TenantSettingsDto,
} from '@rea/shared-types';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { ErrorState } from '@/components/states/states';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { Select } from '@/components/ui/input';
import { Panel, PanelHeader } from '@/components/ui/panel';
import { Skeleton } from '@/components/ui/skeleton';
import { TIMEZONES } from '@/features/onboarding/reference-data';
import { usePermission } from '@/hooks/use-permission';
import { api, ApiError } from '@/lib/api-client';
import { queryKeys } from '@/lib/query-keys';

type Values = Pick<TenantSettingsDto, 'timezone' | 'locale' | 'currency' | 'preferredLanguage'>;
const LOCALE_LABELS: Record<string, string> = {
  'en-IN': 'English (India)',
  'hi-IN': 'हिन्दी (भारत)',
};

export function PreferencesTab() {
  const canEdit = usePermission(Permission.SETTINGS_UPDATE);
  const queryClient = useQueryClient();
  const settings = useQuery({
    queryKey: queryKeys.settings,
    queryFn: () => api<TenantSettingsDto>('/tenants/current/settings'),
  });
  const form = useForm<Values>();

  useEffect(() => {
    if (settings.data) {
      const { timezone, locale, currency, preferredLanguage } = settings.data;
      form.reset({ timezone, locale, currency, preferredLanguage });
    }
  }, [settings.data, form]);

  const save = useMutation({
    mutationFn: (values: Values) =>
      api<TenantSettingsDto>('/tenants/current/settings', { method: 'PATCH', body: values }),
    onSuccess: (data) => {
      toast.success('Preferences saved');
      queryClient.setQueryData(queryKeys.settings, data);
    },
    onError: (error) =>
      toast.error(error instanceof ApiError ? error.message : 'Preferences were not saved'),
  });

  if (settings.isError) return <ErrorState error={settings.error} />;
  if (!settings.data) return <Skeleton className="h-64" />;
  const zones = TIMEZONES.some((z) => z.value === settings.data.timezone)
    ? TIMEZONES
    : [{ value: settings.data.timezone, label: settings.data.timezone }, ...TIMEZONES];

  return (
    <Panel>
      <PanelHeader
        title="Preferences"
        description="Regional formats and the default conversation language."
      />
      <form onSubmit={form.handleSubmit((v) => save.mutate(v))} className="space-y-5 p-5">
        {!canEdit && (
          <Alert tone="info">Only owners, admins and managers can change preferences.</Alert>
        )}
        <fieldset disabled={!canEdit} className="grid gap-5 sm:grid-cols-2">
          <Field label="Time zone">
            {(c) => (
              <Select {...c} {...form.register('timezone')}>
                {zones.map((tz) => (
                  <option key={tz.value} value={tz.value}>
                    {tz.label}
                  </option>
                ))}
              </Select>
            )}
          </Field>
          <Field label="Preferred language" hint="Default language for your AI employee.">
            {(c) => (
              <Select {...c} {...form.register('preferredLanguage')}>
                {Object.values(PreferredLanguage).map((code) => (
                  <option key={code} value={code}>
                    {LANGUAGE_LABELS[code]}
                  </option>
                ))}
              </Select>
            )}
          </Field>
          <Field label="Locale" hint="Date and number formatting.">
            {(c) => (
              <Select {...c} {...form.register('locale')}>
                {SUPPORTED_LOCALES.map((l) => (
                  <option key={l} value={l}>
                    {LOCALE_LABELS[l] ?? l}
                  </option>
                ))}
              </Select>
            )}
          </Field>
          <Field label="Currency">
            {(c) => (
              <Select {...c} {...form.register('currency')}>
                {SUPPORTED_CURRENCIES.map((cur) => (
                  <option key={cur} value={cur}>
                    {cur === 'INR' ? 'Indian rupee (₹)' : cur}
                  </option>
                ))}
              </Select>
            )}
          </Field>
        </fieldset>
        {canEdit && (
          <div className="flex justify-end border-t border-subtle pt-4">
            <Button type="submit" loading={save.isPending} disabled={!form.formState.isDirty}>
              Save preferences
            </Button>
          </div>
        )}
      </form>
    </Panel>
  );
}
