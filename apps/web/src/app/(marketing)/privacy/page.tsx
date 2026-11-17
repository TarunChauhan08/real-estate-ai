import type { Metadata } from 'next';
import Link from 'next/link';
import { TextPage } from '@/components/marketing/legal-page';
import { COMPANY } from '@/lib/company';
import { OG_IMAGE, SITE_NAME } from '@/lib/site';

/*
 * DRAFT PRIVACY POLICY — have it reviewed by a lawyer before launch.
 * Written for India's Digital Personal Data Protection Act 2023 (DPDP Act) and IT Rules, and for
 * how this product actually handles data. Company details come from src/lib/company.ts.
 */

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description: `How ${SITE_NAME} collects, uses, shares and protects personal data, and your rights under India's Digital Personal Data Protection Act.`,
  alternates: { canonical: '/privacy' },
  openGraph: { url: '/privacy', images: [OG_IMAGE] },
};

export default function PrivacyPage() {
  const c = COMPANY;
  return (
    <TextPage
      title="Privacy Policy"
      path="/privacy"
      updated={c.policiesEffectiveDate}
      intro={`This policy explains what personal data ${c.legalName} (“we”) handles when you use ${SITE_NAME} (the “Service”), why, and the choices and rights you have.`}
    >
      <h2>1. Two kinds of data, two roles</h2>
      <p>
        <strong>Your account data</strong> — the people at a business who use the Service (name,
        email, password, role). For this data we decide how it is used, so we are the{' '}
        <strong>Data Fiduciary</strong>.
      </p>
      <p>
        <strong>Your customers’ data</strong> — buyers and tenants who contact a business that uses
        the Service (for example their WhatsApp number, name, messages and property requirements).
        The business decides why this data is collected; it is the Data Fiduciary and we process the
        data on its behalf as a <strong>Data Processor</strong>, only to provide the Service. Buyers
        with questions about their data should contact that business first; we will help it respond.
      </p>

      <h2>2. What we collect</h2>
      <ul>
        <li>
          <strong>Account and business details:</strong> name, email, business name and type,
          optional phone, city, website and preferences.
        </li>
        <li>
          <strong>Sign-in and security data:</strong> a one-way hash of your password (we never
          store the password itself), sign-in sessions, the browser type, and an audit log of
          important actions.
        </li>
        <li>
          <strong>Content you add:</strong> property listings, leads, notes, site visits and team
          invitations.
        </li>
        <li>
          <strong>Conversation data (as Processor):</strong> messages between buyers and the
          business on WhatsApp or web chat, and the details the AI extracts from them, such as
          budget, location, configuration, timeline and home-loan need.
        </li>
        <li>
          <strong>Website enquiries:</strong> what you send us through the contact form.
        </li>
      </ul>
      <p>
        We do not ask for, and ask businesses not to enter, Aadhaar, PAN, bank or card details in
        the Service.
      </p>

      <h2>3. Why we use it</h2>
      <ul>
        <li>
          To provide the Service: sign-in, the AI sales assistant, the inbox, leads and visits.
        </li>
        <li>
          To keep it secure: preventing abuse, investigating incidents, keeping an audit trail.
        </li>
        <li>
          To send service emails: email confirmation, password resets, invitations and important
          changes. We do not send marketing emails without your consent.
        </li>
        <li>To answer enquiries and support requests, and to meet legal obligations.</li>
      </ul>
      <p>
        We rely on your consent and on the legitimate uses permitted by the DPDP Act, such as
        providing a service you asked for. We do <strong>not</strong> sell personal data, and we do
        not use customers’ conversation data to advertise to anyone.
      </p>

      <h2>4. Artificial intelligence</h2>
      <p>
        To write replies, the Service sends the relevant conversation, the buyer’s known
        requirements and matching listings to an AI model provider (currently Anthropic). Under our
        agreement with that provider, the data is used to generate the reply and not to train its
        models. AI replies can be wrong; businesses stay responsible for what they promise, and
        sensitive topics such as discounts, legal questions and complaints are handed to a person.
      </p>

      <h2>5. Who we share data with</h2>
      <p>
        Only with service providers that help us run the Service, under contracts that protect it:
      </p>
      <ul>
        <li>Cloud hosting and database providers, to store and run the Service.</li>
        <li>Meta (WhatsApp Business Platform), to send and receive WhatsApp messages.</li>
        <li>Anthropic, to generate AI replies (see section 4).</li>
        <li>Resend, to deliver service emails.</li>
      </ul>
      <p>
        We may also disclose data when Indian law requires it, or to protect the rights and safety
        of people and the Service.
      </p>

      <h2>6. Where data is processed</h2>
      <p>
        Some providers process data outside India. We transfer data only to countries the Government
        of India has not restricted, and with safeguards in our contracts.
      </p>

      <h2>7. How long we keep it</h2>
      <ul>
        <li>Account and business data: while the account is active.</li>
        <li>
          Customers’ data: as long as the business keeps it in the Service, and deleted when the
          business asks or closes its account, unless the law requires us to keep it longer.
        </li>
        <li>Security and audit logs: for as long as needed to keep the Service secure.</li>
        <li>Sign-in links (password reset, email confirmation) expire within hours.</li>
      </ul>

      <h2>8. How we protect it</h2>
      <ul>
        <li>Encrypted connections (HTTPS) everywhere.</li>
        <li>Passwords hashed with Argon2id; sign-in tokens stored only as hashes.</li>
        <li>WhatsApp access tokens encrypted with AES-256-GCM.</li>
        <li>Each business’s data is kept separate and checked on every request.</li>
        <li>Role-based access for team members, and an audit log of important changes.</li>
      </ul>
      <p>
        If a personal data breach happens, we will inform the Data Protection Board of India and the
        people affected as the law requires.
      </p>

      <h2>9. Your rights</h2>
      <p>Under the DPDP Act you can ask us to:</p>
      <ul>
        <li>tell you what personal data we process about you and how;</li>
        <li>correct, complete or update it;</li>
        <li>erase it, when it is no longer needed and the law does not require us to keep it;</li>
        <li>withdraw consent you have given (this does not affect what happened before);</li>
        <li>nominate someone to exercise these rights if you die or become unable to;</li>
        <li>handle a grievance about how your data is processed.</li>
      </ul>
      <p>
        Write to <a href={`mailto:${c.email}`}>{c.email}</a>. We may need to confirm who you are
        before acting.
      </p>

      <h2>10. Grievance Officer</h2>
      <p>
        {c.grievanceOfficer.name}
        <br />
        Email: <a href={`mailto:${c.grievanceOfficer.email}`}>{c.grievanceOfficer.email}</a>
        <br />
        {c.address}
      </p>
      <p>
        We acknowledge grievances promptly and aim to resolve them within the time the law allows.
        If you are not satisfied, you may complain to the Data Protection Board of India.
      </p>

      <h2>11. Cookies</h2>
      <p>
        We use one essential cookie to keep you signed in securely. We do not use advertising or
        cross-site tracking cookies.
      </p>

      <h2>12. Children</h2>
      <p>The Service is for businesses and is not meant for people under 18.</p>

      <h2>13. Changes</h2>
      <p>
        We will post changes here with a new effective date, and tell account owners by email about
        important ones.
      </p>

      <h2>14. Contact</h2>
      <p>
        {c.legalName}, {c.address}. Email <a href={`mailto:${c.email}`}>{c.email}</a>. See also our{' '}
        <Link href="/terms">Terms of Service</Link>.
      </p>
    </TextPage>
  );
}
