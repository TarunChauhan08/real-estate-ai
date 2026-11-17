'use client';

import { use } from 'react';
import { LeadDetail } from '@/features/leads/lead-detail';

export default function LeadPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return <LeadDetail id={id} />;
}
