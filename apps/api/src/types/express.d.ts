declare global {
  namespace Express {
    interface Request {
      /** Correlation ID assigned by RequestIdMiddleware. */
      requestId?: string;
    }
  }
}

export {};
