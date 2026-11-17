'use client';

import { useQueryClient } from '@tanstack/react-query';
import { type SessionResponse } from '@rea/shared-types';
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api, onSessionChange, refreshSession, setSession } from '@/lib/api-client';

type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated';

interface AuthContextValue {
  status: AuthStatus;
  session: SessionResponse | null;
  /** Stores a session returned by login, register or invitation acceptance. */
  signIn: (session: SessionResponse) => void;
  signOut: () => Promise<void>;
  switchTenant: (tenantId: string) => Promise<void>;
  /** Re-reads the session (e.g. after onboarding changes the tenant status). */
  reload: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient();
  const [session, setSessionState] = useState<SessionResponse | null>(null);
  const [status, setStatus] = useState<AuthStatus>('loading');

  useEffect(() => {
    const unsubscribe = onSessionChange((next) => {
      setSessionState(next);
      setStatus(next ? 'authenticated' : 'unauthenticated');
    });
    // Restore the session from the HttpOnly refresh cookie on first load.
    void refreshSession();
    return () => {
      unsubscribe();
    };
  }, []);

  const signIn = useCallback(
    (next: SessionResponse) => {
      queryClient.clear();
      setSession(next);
    },
    [queryClient],
  );

  const signOut = useCallback(async () => {
    try {
      await api<void>('/auth/logout', { method: 'POST' });
    } finally {
      queryClient.clear();
      setSession(null);
    }
  }, [queryClient]);

  const switchTenant = useCallback(
    async (tenantId: string) => {
      const next = await api<SessionResponse>('/auth/switch-tenant', { method: 'POST', body: { tenantId } });
      queryClient.clear();
      setSession(next);
    },
    [queryClient],
  );

  const reload = useCallback(async () => {
    await refreshSession();
  }, []);

  const value = useMemo(
    () => ({ status, session, signIn, signOut, switchTenant, reload }),
    [status, session, signIn, signOut, switchTenant, reload],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside AuthProvider');
  return context;
}
