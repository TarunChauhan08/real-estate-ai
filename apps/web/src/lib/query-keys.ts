export const queryKeys = {
  me: ['me'] as const,
  tenant: ['tenant'] as const,
  profile: ['tenant', 'profile'] as const,
  settings: ['tenant', 'settings'] as const,
  overview: ['dashboard', 'overview'] as const,
  members: (params: string) => ['team', 'members', params] as const,
  invitations: (params: string) => ['team', 'invitations', params] as const,
};
