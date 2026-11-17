/** A demo / contact request from the public website. */
export interface ContactRequest {
  name: string;
  email: string;
  phone?: string;
  company?: string;
  city?: string;
  message: string;
  /** Page it was sent from. */
  source?: string;
  /** Honeypot; leave empty. */
  website?: string;
}
