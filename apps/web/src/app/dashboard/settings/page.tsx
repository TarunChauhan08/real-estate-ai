'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { PageHeader } from '@/components/layout/dashboard-shell';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BusinessProfileTab } from '@/features/settings/business-profile-tab';
import { DataTab } from '@/features/settings/data-tab';
import { AccountTab, SecurityTab, TeamTab } from '@/features/settings/other-tabs';
import { PreferencesTab } from '@/features/settings/preferences-tab';

const TABS = [
  { value: 'business', label: 'Business profile' },
  { value: 'account', label: 'Account' },
  { value: 'team', label: 'Team' },
  { value: 'preferences', label: 'Preferences' },
  { value: 'security', label: 'Security' },
  { value: 'data', label: 'Your data' },
] as const;

function SettingsTabs() {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const requested = params.get('tab');
  const tab = TABS.some((t) => t.value === requested) ? requested! : 'business';

  return (
    <Tabs
      value={tab}
      onValueChange={(value) => router.replace(`${pathname}?tab=${value}`, { scroll: false })}
    >
      <TabsList>
        {TABS.map((t) => (
          <TabsTrigger key={t.value} value={t.value}>
            {t.label}
          </TabsTrigger>
        ))}
      </TabsList>
      <TabsContent value="business">
        <BusinessProfileTab />
      </TabsContent>
      <TabsContent value="account">
        <AccountTab />
      </TabsContent>
      <TabsContent value="team">
        <TeamTab />
      </TabsContent>
      <TabsContent value="preferences">
        <PreferencesTab />
      </TabsContent>
      <TabsContent value="security">
        <SecurityTab />
      </TabsContent>
      <TabsContent value="data">
        <DataTab />
      </TabsContent>
    </Tabs>
  );
}

export default function SettingsPage() {
  return (
    <>
      <PageHeader
        title="Settings"
        description="Manage your business, your account and how your workspace behaves."
      />
      <Suspense>
        <SettingsTabs />
      </Suspense>
    </>
  );
}
