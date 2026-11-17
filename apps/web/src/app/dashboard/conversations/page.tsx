'use client';

import { Suspense } from 'react';
import { ConversationsView } from '@/features/conversations/conversations-view';

export default function ConversationsPage() {
  return (
    <Suspense>
      <ConversationsView />
    </Suspense>
  );
}
