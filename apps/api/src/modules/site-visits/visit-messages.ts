/**
 * Buyer-facing WhatsApp messages about site visits, in the buyer's language.
 * Pure functions: the wording is easy to review and unit-test.
 */

export type VisitMessageKind = 'confirmed' | 'rescheduled' | 'cancelled' | 'reminder';
export type VisitLanguage = 'en' | 'hi' | 'hinglish';

export interface VisitMessageInput {
  kind: VisitMessageKind;
  language: string | null;
  scheduledAt: Date | null;
  /** IANA time zone of the business, e.g. Asia/Kolkata. */
  timeZone: string;
  businessName: string;
  propertyTitle: string | null;
  place: string | null;
  agentName: string | null;
}

export function toVisitLanguage(value: string | null): VisitLanguage {
  return value === 'hi' || value === 'hinglish' ? value : 'en';
}

/** "Sat, 22 Nov, 11:00 am" in the business's time zone. */
export function formatVisitTime(date: Date, timeZone: string, language: VisitLanguage): string {
  return new Intl.DateTimeFormat(language === 'hi' ? 'hi-IN' : 'en-IN', {
    timeZone,
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
  }).format(date);
}

export function buildVisitMessage(input: VisitMessageInput): string {
  const lang = toVisitLanguage(input.language);
  const when = input.scheduledAt ? formatVisitTime(input.scheduledAt, input.timeZone, lang) : '';
  const property = [input.propertyTitle, input.place].filter(Boolean).join(', ');

  const t = TEXT[lang];
  const lines: string[] = [t.heading[input.kind]];
  if (input.kind !== 'cancelled') {
    if (when) lines.push(`📅 ${when}`);
    if (property) lines.push(`🏠 ${property}`);
    if (input.agentName) lines.push(`👤 ${t.meet(input.agentName)}`);
    lines.push(t.footer(input.businessName));
  } else {
    lines.push(t.cancelledFooter(input.businessName));
  }
  return lines.join('\n');
}

const TEXT: Record<
  VisitLanguage,
  {
    heading: Record<VisitMessageKind, string>;
    meet: (name: string) => string;
    footer: (business: string) => string;
    cancelledFooter: (business: string) => string;
  }
> = {
  en: {
    heading: {
      confirmed: 'Your site visit is confirmed ✅',
      rescheduled: 'Your site visit has a new time 🔄',
      cancelled: 'Your site visit has been cancelled.',
      reminder: 'Reminder: your site visit is coming up ⏰',
    },
    meet: (name) => `${name} will meet you there.`,
    footer: (business) => `Reply here if you need to change anything. — ${business}`,
    cancelledFooter: (business) => `Reply here whenever you would like a new time. — ${business}`,
  },
  hinglish: {
    heading: {
      confirmed: 'Aapki site visit confirm ho gayi hai ✅',
      rescheduled: 'Aapki site visit ka naya time 🔄',
      cancelled: 'Aapki site visit cancel ho gayi hai.',
      reminder: 'Yaad dila rahe hain: aapki site visit jaldi hai ⏰',
    },
    meet: (name) => `${name} aapse wahan milenge.`,
    footer: (business) => `Kuch badalna ho toh yahin reply karein. — ${business}`,
    cancelledFooter: (business) => `Naya time chahiye toh yahin reply karein. — ${business}`,
  },
  hi: {
    heading: {
      confirmed: 'आपकी साइट विज़िट पक्की हो गई है ✅',
      rescheduled: 'आपकी साइट विज़िट का नया समय 🔄',
      cancelled: 'आपकी साइट विज़िट रद्द कर दी गई है।',
      reminder: 'याद दिला रहे हैं: आपकी साइट विज़िट जल्द है ⏰',
    },
    meet: (name) => `${name} वहाँ आपसे मिलेंगे।`,
    footer: (business) => `कुछ बदलना हो तो यहीं जवाब दें। — ${business}`,
    cancelledFooter: (business) => `नया समय चाहिए तो यहीं जवाब दें। — ${business}`,
  },
};
