'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { type ContactRequest } from '@rea/shared-types';
import { CheckCircle2 } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { Input, Textarea } from '@/components/ui/input';
import { api, ApiError, applyFieldErrors } from '@/lib/api-client';

const schema = z.object({
  name: z.string().trim().min(2, 'Enter your name').max(120),
  email: z.string().trim().min(1, 'Enter your email').email('Enter a valid email address'),
  phone: z
    .string()
    .trim()
    .refine((v) => v === '' || /^[+\d][\d\s-]{7,18}$/.test(v), 'Enter a valid phone number'),
  company: z.string().trim().max(160),
  city: z.string().trim().max(80),
  message: z.string().trim().min(10, 'Tell us a little more (at least 10 characters)').max(3000),
  website: z.string(),
});
type Values = z.infer<typeof schema>;

/** Demo / contact request. Works without an account; goes to the vendor's inbox. */
export function ContactForm({ source }: { source: string }) {
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: '',
      email: '',
      phone: '',
      company: '',
      city: '',
      message: '',
      website: '',
    },
  });

  const onSubmit = form.handleSubmit(async (v) => {
    setError(null);
    try {
      const body: ContactRequest = {
        name: v.name,
        email: v.email,
        message: v.message,
        source,
        ...(v.phone ? { phone: v.phone } : {}),
        ...(v.company ? { company: v.company } : {}),
        ...(v.city ? { city: v.city } : {}),
        ...(v.website ? { website: v.website } : {}),
      };
      await api('/public/contact', { method: 'POST', body });
      setSent(true);
    } catch (e) {
      if (!applyFieldErrors(e, form.setError))
        setError(
          e instanceof ApiError ? e.message : 'Your message was not sent. Please try again.',
        );
    }
  });

  if (sent)
    return (
      <div role="status" className="rounded-[20px] border border-line bg-canvas p-8">
        <CheckCircle2 className="size-8 text-success" aria-hidden />
        <h2 className="mt-4 text-xl font-semibold text-fg">Thank you — we have your message.</h2>
        <p className="mt-2 text-fg-muted">
          We will reply within one working day to set up your demo.
        </p>
      </div>
    );

  const e = form.formState.errors;
  return (
    <form noValidate onSubmit={onSubmit} className="space-y-4" aria-label="Request a demo">
      {error && <Alert tone="danger">{error}</Alert>}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Your name" error={e.name?.message}>
          {(c) => <Input {...c} autoComplete="name" {...form.register('name')} />}
        </Field>
        <Field label="Work email" error={e.email?.message}>
          {(c) => <Input {...c} type="email" autoComplete="email" {...form.register('email')} />}
        </Field>
        <Field label="Phone" optional error={e.phone?.message}>
          {(c) => <Input {...c} type="tel" autoComplete="tel" {...form.register('phone')} />}
        </Field>
        <Field label="Business name" optional error={e.company?.message}>
          {(c) => <Input {...c} autoComplete="organization" {...form.register('company')} />}
        </Field>
      </div>
      <Field label="City" optional error={e.city?.message}>
        {(c) => <Input {...c} autoComplete="address-level2" {...form.register('city')} />}
      </Field>
      <Field label="How can we help?" error={e.message?.message}>
        {(c) => (
          <Textarea
            {...c}
            rows={4}
            placeholder="e.g. We are a brokerage in Pune with about 300 WhatsApp enquiries a month."
            {...form.register('message')}
          />
        )}
      </Field>
      {/* Honeypot: hidden from people and screen readers; bots fill it in. */}
      <div aria-hidden="true" className="absolute left-[-10000px] top-auto size-px overflow-hidden">
        <label>
          Leave this empty
          <input tabIndex={-1} autoComplete="off" {...form.register('website')} />
        </label>
      </div>
      <Button type="submit" size="lg" loading={form.formState.isSubmitting}>
        Request a demo
      </Button>
      <p className="text-xs text-fg-muted">
        We use these details only to reply to you. See our{' '}
        <Link href="/privacy" className="underline">
          Privacy Policy
        </Link>
        .
      </p>
    </form>
  );
}
