/**
 * Your company's details — the ONE place to fill in before launch.
 *
 * They appear on the About, Contact, Privacy Policy and Terms pages and in the footer. Meta
 * (WhatsApp business verification) and payment/KYC providers check that these match your
 * registration documents, so use your exact registered name and address.
 *
 * Anything still in [square brackets] is a placeholder; `docs/seo.md` and the launch checklist
 * remind you to replace them.
 */
export const COMPANY = {
  /** Registered legal name, e.g. "Acme Proptech Private Limited". */
  legalName: '[Company legal name]',
  /** Full registered address. */
  address: '[Registered office address, City, State, PIN]',
  city: '[City]',
  /** Public support email. */
  email: '[support@yourdomain.in]',
  /** Optional public phone in international format, or empty. */
  phone: '[+91 phone number]',
  /** Optional GSTIN, or empty. */
  gstin: '',
  /**
   * Grievance Officer — required for Indian intermediaries (IT Rules 2021) and expected under the
   * Digital Personal Data Protection Act 2023 for handling data-protection complaints.
   */
  grievanceOfficer: {
    name: '[Grievance Officer name]',
    email: '[grievance@yourdomain.in]',
  },
  /** Courts with jurisdiction in the Terms of Service. */
  jurisdictionCity: '[City]',
  /** Date the current Privacy Policy and Terms took effect (YYYY-MM-DD). */
  policiesEffectiveDate: '2026-11-18',
} as const;

/** True while a value is still a [placeholder]. */
export const isPlaceholder = (value: string): boolean => /^\[.*\]$/.test(value.trim());

/** A value that is ready to show (not empty, not a placeholder). */
export const filled = (value: string): string | null =>
  value.trim() && !isPlaceholder(value) ? value.trim() : null;
