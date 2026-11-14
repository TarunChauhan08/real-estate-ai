'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';
import { Toaster } from 'sonner';
import { AuthProvider } from '@/features/auth/auth-provider';
import { ApiError } from '@/lib/api-client';

export function Providers({ children }: { children: React.ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            refetchOnWindowFocus: false,
            // Never retry authorization or validation failures.
            retry: (count, error) => !(error instanceof ApiError && error.status < 500 && error.status !== 0) && count < 2,
          },
        },
      }),
  );
  return (
    <QueryClientProvider client={client}>
      <AuthProvider>{children}</AuthProvider>
      <Toaster
        position="bottom-right"
        richColors
        closeButton
        // Re-themed with the measured palette (library defaults miss 4.5:1 on success).
        style={
          {
            '--success-bg': '#e9f6e9',
            '--success-border': '#b2ddb5',
            '--success-text': '#2a7e3b',
            '--error-bg': '#feebec',
            '--error-border': '#fdbdbe',
            '--error-text': '#ce2c31',
            '--info-bg': '#e0f8f3',
            '--info-border': '#a1ded2',
            '--info-text': '#00715f',
            fontFamily: 'var(--font-sans)',
          } as React.CSSProperties
        }
      />
    </QueryClientProvider>
  );
}
