/** Browser-facing API base URL, e.g. http://localhost:4000/api/v1 */
/** Optional: address that receives private demo requests from the public site. */
export const DEMO_REQUEST_EMAIL = process.env.NEXT_PUBLIC_DEMO_REQUEST_EMAIL ?? '';

export const API_URL = (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api/v1').replace(/\/$/, '');
