'use client';

import { useEffect, useState } from 'react';

/**
 * Reads `#token=…` from the address (fragments are never sent to servers, so tokens stay out of
 * access logs) and then removes it from the address bar and history.
 * `undefined` while reading, `null` if there was no token.
 */
export function useFragmentToken(): string | null | undefined {
  const [token, setToken] = useState<string | null | undefined>(undefined);
  useEffect(() => {
    const value = new URLSearchParams(window.location.hash.slice(1)).get('token');
    setToken(value);
    if (value) window.history.replaceState(null, '', window.location.pathname);
  }, []);
  return token;
}
