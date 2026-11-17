import { type ApiErrorBody, type SessionResponse } from '@rea/shared-types';
import { API_URL } from './env';

/** Error thrown for any non-2xx API response, carrying the server's stable error code. */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly details: Array<{ field: string; message: string }> = [],
    readonly requestId?: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

type SessionListener = (session: SessionResponse | null) => void;

/**
 * The access token lives only in memory (never localStorage) so injected scripts cannot
 * persist it. The refresh token is an HttpOnly cookie the browser sends to /auth/* only.
 */
let accessToken: string | null = null;
let refreshInFlight: Promise<SessionResponse | null> | null = null;
let lastRefreshError: ApiError | null = null;

/** Set when the most recent session check failed because the API could not be reached. */
export function getConnectionError(): ApiError | null {
  return lastRefreshError;
}
const listeners = new Set<SessionListener>();

export function onSessionChange(listener: SessionListener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function setSession(session: SessionResponse | null): void {
  accessToken = session?.accessToken ?? null;
  listeners.forEach((listener) => listener(session));
}

async function parse<T>(res: Response): Promise<T> {
  if (res.status === 204) return undefined as T;
  const body: unknown = await res.json().catch(() => null);
  if (!res.ok) {
    const error = (body as ApiErrorBody | null)?.error;
    throw new ApiError(
      res.status,
      error?.code ?? 'NETWORK_ERROR',
      error?.message ?? `Request failed (${res.status})`,
      error?.details,
      error?.requestId,
    );
  }
  return body as T;
}

async function send(path: string, init: RequestInit & { json?: unknown }): Promise<Response> {
  const headers = new Headers(init.headers);
  if (init.json !== undefined) headers.set('Content-Type', 'application/json');
  if (accessToken) headers.set('Authorization', `Bearer ${accessToken}`);
  try {
    return await fetch(`${API_URL}${path}`, {
      ...init,
      headers,
      body: init.json !== undefined ? JSON.stringify(init.json) : init.body,
      credentials: 'include',
    });
  } catch {
    throw new ApiError(
      0,
      'NETWORK_ERROR',
      'Cannot reach the server. Check your connection and try again.',
    );
  }
}

/**
 * Exchanges the refresh cookie for a new session. Concurrent callers share one request;
 * a benign rotation race (another tab refreshed first) is retried once with the new cookie.
 */
export function refreshSession(): Promise<SessionResponse | null> {
  refreshInFlight ??= (async () => {
    for (let attempt = 0; attempt < 2; attempt += 1) {
      let res: Response;
      try {
        res = await send('/auth/refresh', { method: 'POST' });
      } catch (error) {
        // API unreachable: resolve to signed-out rather than leaving the app waiting forever.
        lastRefreshError = error instanceof ApiError ? error : null;
        break;
      }
      lastRefreshError = null;
      if (res.ok) {
        const { data } = await parse<{ data: SessionResponse }>(res);
        setSession(data);
        return data;
      }
      const error = await parse<never>(res).catch((e: unknown) => e);
      if (!(error instanceof ApiError && error.code === 'REFRESH_RACE')) break;
    }
    setSession(null);
    return null;
  })().finally(() => {
    refreshInFlight = null;
  });
  return refreshInFlight;
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  body?: unknown;
}

/** Authenticated JSON request that unwraps `{ data }` and refreshes the access token once on 401. */
export async function api<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const init = { method: options.method ?? 'GET', json: options.body };
  let res = await send(path, init);
  if (res.status === 401 && !path.startsWith('/auth/')) {
    const session = await refreshSession();
    if (session) res = await send(path, init);
  }
  const body = await parse<{ data: T }>(res);
  return body?.data as T;
}

/** Like `api` but keeps pagination metadata. */
export async function apiPage<T>(path: string): Promise<{
  data: T[];
  meta: { total: number; page: number; pageSize: number; totalPages: number };
}> {
  let res = await send(path, { method: 'GET' });
  if (res.status === 401) {
    const session = await refreshSession();
    if (session) res = await send(path, { method: 'GET' });
  }
  return parse(res);
}

/** Maps API field errors onto a react-hook-form `setError`. Returns true if any were applied. */
export function applyFieldErrors(
  error: unknown,
  setError: (field: never, error: { message: string }) => void,
): boolean {
  if (!(error instanceof ApiError) || error.details.length === 0) return false;
  for (const detail of error.details) setError(detail.field as never, { message: detail.message });
  return true;
}
