/**
 * Transactional emails. Plain, branded, readable on a phone, with a text version for every HTML
 * email (spam filters and some mail apps rely on it). All dynamic values are HTML-escaped.
 */
import { type Email } from './mailer';

const BRAND = 'AI Real Estate Sales Employee';

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function layout(input: {
  heading: string;
  paragraphs: string[];
  button: { label: string; url: string };
  footnote: string;
}): string {
  const p = input.paragraphs
    .map(
      (text) =>
        `<p style="margin:0 0 16px;font-size:16px;line-height:1.6;color:#334155">${escapeHtml(text)}</p>`,
    )
    .join('');
  return `<!doctype html>
<html lang="en"><body style="margin:0;background:#f5f6f8;font-family:Segoe UI,Arial,sans-serif">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f5f6f8;padding:32px 12px">
<tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:16px;overflow:hidden">
<tr><td style="background:#0c1f3f;padding:22px 32px;color:#ffffff;font-size:16px;font-weight:700">${BRAND}</td></tr>
<tr><td style="padding:32px">
<h1 style="margin:0 0 20px;font-size:22px;line-height:1.3;color:#0c1f3f">${escapeHtml(input.heading)}</h1>
${p}
<p style="margin:24px 0"><a href="${escapeHtml(input.button.url)}" style="display:inline-block;background:#c8a25a;color:#0c1f3f;text-decoration:none;font-weight:700;padding:13px 22px;border-radius:10px">${escapeHtml(input.button.label)}</a></p>
<p style="margin:0 0 8px;font-size:13px;line-height:1.6;color:#64748b">If the button does not work, copy this link into your browser:<br><span style="word-break:break-all;color:#0c1f3f">${escapeHtml(input.button.url)}</span></p>
<p style="margin:16px 0 0;font-size:13px;line-height:1.6;color:#64748b">${escapeHtml(input.footnote)}</p>
</td></tr></table></td></tr></table></body></html>`;
}

function text(lines: string[]): string {
  return [...lines, '', `— ${BRAND}`].join('\n');
}

export function passwordResetEmail(input: {
  to: string;
  name: string;
  url: string;
  minutes: number;
}): Email {
  const heading = 'Reset your password';
  const paragraphs = [
    `Hi ${input.name},`,
    `Someone asked to reset the password for your account. The link works once and expires in ${input.minutes} minutes.`,
  ];
  const footnote = 'If you did not ask for this, ignore this email — your password stays the same.';
  return {
    to: input.to,
    subject: 'Reset your password',
    html: layout({
      heading,
      paragraphs,
      button: { label: 'Choose a new password', url: input.url },
      footnote,
    }),
    text: text([...paragraphs, '', `Choose a new password: ${input.url}`, '', footnote]),
  };
}

export function verifyEmailEmail(input: {
  to: string;
  name: string;
  url: string;
  hours: number;
}): Email {
  const heading = 'Confirm your email address';
  const paragraphs = [
    `Hi ${input.name},`,
    `Please confirm this is your email address so we can send you password resets and important account messages. The link expires in ${input.hours} hours.`,
  ];
  const footnote = 'If you did not create an account, you can ignore this email.';
  return {
    to: input.to,
    subject: 'Confirm your email address',
    html: layout({
      heading,
      paragraphs,
      button: { label: 'Confirm email', url: input.url },
      footnote,
    }),
    text: text([...paragraphs, '', `Confirm email: ${input.url}`, '', footnote]),
  };
}

export function invitationEmail(input: {
  to: string;
  inviterName: string;
  businessName: string;
  roleLabel: string;
  url: string;
  expiresAt: Date;
}): Email {
  const expires = new Intl.DateTimeFormat('en-IN', {
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
    timeZone: 'Asia/Kolkata',
  }).format(input.expiresAt);
  const heading = `Join ${input.businessName}`;
  const paragraphs = [
    `${input.inviterName} has invited you to join ${input.businessName} as ${input.roleLabel}.`,
    `You will work with leads, conversations and site visits together with the AI sales assistant. This invitation expires on ${expires} (IST).`,
  ];
  const footnote = `If you were not expecting this, ignore this email. Nobody gets access unless you accept.`;
  return {
    to: input.to,
    subject: `${input.inviterName} invited you to ${input.businessName}`,
    html: layout({
      heading,
      paragraphs,
      button: { label: 'Accept invitation', url: input.url },
      footnote,
    }),
    text: text([...paragraphs, '', `Accept invitation: ${input.url}`, '', footnote]),
  };
}
