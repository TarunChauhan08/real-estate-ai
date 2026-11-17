import { escapeHtml, invitationEmail, passwordResetEmail, verifyEmailEmail } from './templates';

describe('email templates', () => {
  it('escapes everything a user controls', () => {
    expect(escapeHtml(`<script>"x"&'y'</script>`)).toBe(
      '&lt;script&gt;&quot;x&quot;&amp;&#39;y&#39;&lt;/script&gt;',
    );
    const email = invitationEmail({
      to: 'a@b.in',
      inviterName: '<b>Evil</b>',
      businessName: 'Noida <Homes>',
      roleLabel: 'Sales agent',
      url: 'https://app.example.in/accept-invitation#token=abc',
      expiresAt: new Date('2026-11-25T06:30:00Z'),
    });
    expect(email.html).not.toContain('<b>Evil</b>');
    expect(email.html).toContain('&lt;b&gt;Evil&lt;/b&gt;');
    expect(email.subject).toBe('<b>Evil</b> invited you to Noida <Homes>');
    expect(email.text).toContain('25 Nov, 12:00 pm');
  });

  it('every email has a working link in both the HTML and the text version', () => {
    const url = 'https://app.example.in/reset-password#token=xyz';
    for (const email of [
      passwordResetEmail({ to: 'a@b.in', name: 'Asha', url, minutes: 60 }),
      verifyEmailEmail({ to: 'a@b.in', name: 'Asha', url, hours: 48 }),
    ]) {
      expect(email.html).toContain(`href="${url}"`);
      expect(email.text).toContain(url);
      expect(email.text).toContain('Hi Asha,');
    }
  });

  it('tells people how long links last and what to do if it was not them', () => {
    const reset = passwordResetEmail({ to: 'a@b.in', name: 'A', url: 'https://x', minutes: 60 });
    expect(reset.text).toMatch(/expires in 60 minutes/);
    expect(reset.text).toMatch(/did not ask for this/);
  });
});
