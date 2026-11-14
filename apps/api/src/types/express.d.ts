import { type AuthContext } from '../modules/auth/auth-context';

declare global {
  namespace Express {
    interface Request {
      /** Correlation ID assigned by RequestIdMiddleware. */
      requestId?: string;
      /** Authenticated principal, set by JwtAuthGuard on protected routes. */
      auth?: AuthContext;
    }
  }
}

export {};
