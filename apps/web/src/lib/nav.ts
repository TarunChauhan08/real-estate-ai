import {
  BellRing,
  Bot,
  Building2,
  CalendarCheck,
  ChartColumn,
  LayoutDashboard,
  MessagesSquare,
  Plug,
  Settings,
  UserRoundSearch,
  Users,
} from 'lucide-react';

export interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  /** Modules that are not built yet render as disabled, clearly labelled entries. */
  available: boolean;
}

export const NAV_ITEMS: NavItem[] = [
  { label: 'Overview', href: '/dashboard', icon: LayoutDashboard, available: true },
  { label: 'AI Employee', href: '/dashboard/ai-employee', icon: Bot, available: true },
  { label: 'Leads', href: '/dashboard/leads', icon: UserRoundSearch, available: true },
  {
    label: 'Conversations',
    href: '/dashboard/conversations',
    icon: MessagesSquare,
    available: true,
  },
  { label: 'Properties', href: '/dashboard/properties', icon: Building2, available: true },
  { label: 'Site Visits', href: '/dashboard/site-visits', icon: CalendarCheck, available: false },
  { label: 'Follow-ups', href: '/dashboard/follow-ups', icon: BellRing, available: false },
  { label: 'Analytics', href: '/dashboard/analytics', icon: ChartColumn, available: false },
  { label: 'Team', href: '/dashboard/team', icon: Users, available: true },
  { label: 'Integrations', href: '/dashboard/integrations', icon: Plug, available: false },
  { label: 'Settings', href: '/dashboard/settings', icon: Settings, available: true },
];
