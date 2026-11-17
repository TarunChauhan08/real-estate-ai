'use client';

import { Permission } from '@rea/shared-types';
import { PageHeader } from '@/components/layout/dashboard-shell';
import { InvitationsList } from '@/features/team/invitations-list';
import { InviteDialog } from '@/features/team/invite-dialog';
import { MembersTable } from '@/features/team/members-table';
import { usePermission, useRole } from '@/hooks/use-permission';

export default function TeamPage() {
  const role = useRole();
  const canInvite = usePermission(Permission.MEMBERS_INVITE);
  return (
    <>
      <PageHeader
        title="Team"
        description="Everyone who can sign in to this business, and what they are allowed to do."
        actions={canInvite && role ? <InviteDialog actorRole={role} /> : undefined}
      />
      <div className="space-y-6">
        <MembersTable />
        {canInvite && <InvitationsList />}
      </div>
    </>
  );
}
