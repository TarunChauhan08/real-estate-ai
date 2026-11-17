import { Mail, MapPin, Phone } from 'lucide-react';
import type { Metadata } from 'next';
import { TextPage } from '@/components/marketing/legal-page';
import { ContactForm } from '@/features/contact/contact-form';
import { COMPANY, filled } from '@/lib/company';
import { OG_IMAGE, SITE_NAME } from '@/lib/site';

export const metadata: Metadata = {
  title: 'Contact us and request a demo',
  description: `Request a demo of ${SITE_NAME} with your own listings, or ask us anything. We reply within one working day.`,
  alternates: { canonical: '/contact' },
  openGraph: { url: '/contact', images: [OG_IMAGE] },
};

export default function ContactPage() {
  const c = COMPANY;
  const phone = filled(c.phone);
  return (
    <TextPage
      title="Contact us"
      path="/contact"
      intro="Tell us a little about your business and we will set up a demo with your own listings. We reply within one working day."
    >
      <div className="grid gap-10 lg:grid-cols-[1.4fr_1fr]">
        <ContactForm source="/contact" />
        <aside className="space-y-5 text-[15px]">
          <p className="flex items-start gap-3">
            <Mail className="mt-1 size-4 shrink-0 text-gold-deep" aria-hidden />
            <a href={`mailto:${c.email}`} className="text-brand-fg underline underline-offset-2">
              {c.email}
            </a>
          </p>
          {phone && (
            <p className="flex items-start gap-3">
              <Phone className="mt-1 size-4 shrink-0 text-gold-deep" aria-hidden />
              <a href={`tel:${phone.replace(/\s/g, '')}`} className="text-brand-fg">
                {phone}
              </a>
            </p>
          )}
          {!phone && c.phone && (
            <p className="flex items-start gap-3">
              <Phone className="mt-1 size-4 shrink-0 text-gold-deep" aria-hidden />
              {c.phone}
            </p>
          )}
          <p className="flex items-start gap-3">
            <MapPin className="mt-1 size-4 shrink-0 text-gold-deep" aria-hidden />
            <span>
              {c.legalName}
              <br />
              {c.address}
            </span>
          </p>
        </aside>
      </div>
    </TextPage>
  );
}
