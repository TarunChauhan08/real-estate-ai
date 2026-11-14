/**
 * Standard API response envelopes. Every JSON response from the API uses one of these shapes.
 */
export interface ApiSuccess<T> {
  data: T;
  meta?: PaginationMeta;
}

export interface ApiErrorBody {
  error: {
    /** Stable, machine-readable code, e.g. `VALIDATION_FAILED`. */
    code: string;
    /** Human-readable, safe-to-display message. */
    message: string;
    /** Optional field-level validation details. */
    details?: Array<{ field: string; message: string }>;
    /** Correlates with the `x-request-id` response header and server logs. */
    requestId?: string;
  };
}

export interface PaginationMeta {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}
