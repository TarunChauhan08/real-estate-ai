import type { Metadata } from 'next';
import Link from 'next/link';
import { TextPage } from '@/components/marketing/legal-page';
import { COMPANY } from '@/lib/company';
import { OG_IMAGE, SITE_NAME } from '@/lib/site';

/*
 * DRAFT TERMS OF SERVICE — have them reviewed by a lawyer before launch.
 * The product is sold to businesses under individual agreements; these terms cover use of the
 * software and say that a signed agreement takes priority. Company details: src/lib/company.ts.
 */

export const metadata: Metadata = {
  title: 'Terms of Service',
  description: `The terms for businesses using ${SITE_NAME}: accounts, acceptable use, WhatsApp and AI responsibilities, data, and liability.`,
  alternates: { canonical: '/terms' },
  openGraph: { url: '/terms', images: [OG_IMAGE] },
};

export default function TermsPage() {
  const c = COMPANY;
  return (
    <TextPage
      title="Terms of Service"
      path="/terms"
      updated={c.policiesEffectiveDate}
      intro={`These terms apply when a business (“you”) uses ${SITE_NAME} (the “Service”) provided by ${c.legalName} (“we”). If you have signed a separate agreement with us, that agreement takes priority where the two differ.`}
    >
      <h2>1. The Service</h2>
      <p>
        The Service is software for real estate businesses: an AI sales assistant that talks to
        buyers on WhatsApp and web chat, plus tools for listings, leads, conversations, site visits
        and team access. Features may change as we improve the product; we will not remove a core
        feature you rely on without reasonable notice.
      </p>

      <h2>2. Accounts</h2>
      <ul>
        <li>
          The person who creates an account confirms they may accept these terms for the business.
        </li>
        <li>Keep passwords private, and give team members only the roles they need.</li>
        <li>
          You are responsible for what happens under your account; tell us at once about misuse.
        </li>
      </ul>

      <h2>3. Your responsibilities</h2>
      <ul>
        <li>
          <strong>Accurate listings.</strong> The AI recommends only the properties, prices and
          details you enter. Keep them correct and up to date, including RERA details where they
          apply.
        </li>
        <li>
          <strong>Lawful contact.</strong> Message only people who contacted you or agreed to hear
          from you, and follow the WhatsApp Business Policy, Meta’s terms and Indian law, including
          the rules on unsolicited commercial communication.
        </li>
        <li>
          <strong>Your customers’ data.</strong> For the personal data of your buyers and tenants
          you are the Data Fiduciary under the Digital Personal Data Protection Act 2023, and we
          process it on your behalf as described in our <Link href="/privacy">Privacy Policy</Link>.
          You are responsible for having a lawful basis to collect it.
        </li>
        <li>
          <strong>Final decisions stay with you.</strong> Prices, discounts, availability, bookings,
          legal and financial statements are your commitments, not the AI’s.
        </li>
      </ul>

      <h2>4. About the AI</h2>
      <p>
        The AI is designed not to invent properties, prices, offers or legal facts and to hand
        sensitive questions to your team, but like any AI it can make mistakes. Review
        conversations, use the tools to pause the AI and reply yourself, and do not rely on it for
        legal, financial or tax advice to buyers.
      </p>

      <h2>5. Acceptable use</h2>
      <p>You must not use the Service to:</p>
      <ul>
        <li>
          send spam, misleading claims, or content that is unlawful, abusive or discriminatory;
        </li>
        <li>break the law, including consumer-protection, real-estate and data-protection law;</li>
        <li>
          access other businesses’ data, probe or overload the Service, or get around its limits;
        </li>
        <li>copy, resell or reverse-engineer the Service except as the law allows.</li>
      </ul>

      <h2>6. Your data</h2>
      <p>
        You own the data you and your buyers put into the Service. You give us permission to process
        it only to provide, secure and support the Service. You can ask for an export or deletion of
        your business’s data at any time.
      </p>

      <h2>7. Third-party services</h2>
      <p>
        Parts of the Service depend on others, such as Meta’s WhatsApp Business Platform, AI model
        providers and email delivery. Their terms also apply to your use of them, and we are not
        responsible for their outages or policy decisions, such as WhatsApp restricting a number.
      </p>

      <h2>8. Fees</h2>
      <p>Fees, if any, are set out in your order or agreement with us.</p>

      <h2>9. Availability and support</h2>
      <p>
        We work to keep the Service available and secure, but it is provided “as is” and may
        occasionally be interrupted for maintenance or reasons outside our control. Service levels,
        if agreed, are in your agreement with us.
      </p>

      <h2>10. Liability</h2>
      <p>
        To the extent the law allows, we are not liable for indirect or consequential losses (such
        as lost sales or profits), and our total liability for any claim is limited to the fees you
        paid us for the Service in the twelve months before the claim. Nothing in these terms limits
        liability that cannot be limited by law.
      </p>

      <h2>11. Suspension and ending</h2>
      <p>
        You may stop using the Service at any time. We may suspend or close an account that breaks
        these terms or puts others at risk, and will tell you why unless the law prevents it. After
        an account closes, we delete its data as described in the Privacy Policy.
      </p>

      <h2>12. Changes to these terms</h2>
      <p>
        We may update these terms and will post the new version here with its effective date. For
        important changes we will tell account owners in advance by email.
      </p>

      <h2>13. Law and disputes</h2>
      <p>
        These terms are governed by the laws of India. The courts of {c.jurisdictionCity} have
        exclusive jurisdiction.
      </p>

      <h2>14. Contact</h2>
      <p>
        {c.legalName}, {c.address}. Email <a href={`mailto:${c.email}`}>{c.email}</a>.
      </p>
    </TextPage>
  );
}
