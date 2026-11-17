import {
  LEAD_STATUS_LABELS,
  LEAD_TEMPERATURE_LABELS,
  type LeadStatus,
  type LeadTemperature,
} from '@rea/shared-types';
import { Flame, Snowflake, Sun } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export function TemperatureBadge({ value }: { value: LeadTemperature }) {
  if (value === 'HOT')
    return (
      <Badge tone="warning">
        <Flame className="size-3" aria-hidden /> {LEAD_TEMPERATURE_LABELS[value]}
      </Badge>
    );
  if (value === 'WARM')
    return (
      <Badge tone="ink">
        <Sun className="size-3" aria-hidden /> {LEAD_TEMPERATURE_LABELS[value]}
      </Badge>
    );
  if (value === 'COLD')
    return (
      <Badge>
        <Snowflake className="size-3" aria-hidden /> {LEAD_TEMPERATURE_LABELS[value]}
      </Badge>
    );
  return (
    <Badge className="bg-transparent text-fg-muted ring-1 ring-line">
      {LEAD_TEMPERATURE_LABELS[value]}
    </Badge>
  );
}

const STATUS_TONE: Record<LeadStatus, 'neutral' | 'ink' | 'success' | 'warning' | 'danger'> = {
  NEW: 'neutral',
  CONTACTED: 'ink',
  QUALIFIED: 'ink',
  SITE_VISIT_SCHEDULED: 'warning',
  NEGOTIATION: 'warning',
  WON: 'success',
  LOST: 'danger',
};

export function LeadStatusBadge({ value }: { value: LeadStatus }) {
  return <Badge tone={STATUS_TONE[value]}>{LEAD_STATUS_LABELS[value]}</Badge>;
}

/** "₹60 lakh – ₹85 lakh", "up to ₹85 lakh", or null. */
export { formatBudget } from './format';
