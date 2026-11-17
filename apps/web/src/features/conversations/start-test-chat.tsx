'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { type ConversationDto } from '@rea/shared-types';
import { MessagesSquare, Shuffle } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Panel } from '@/components/ui/panel';
import { api, ApiError, applyFieldErrors } from '@/lib/api-client';

const schema = z.object({
  phone: z
    .string()
    .trim()
    .regex(/^[+\d][\d\s-]{7,18}$/, 'Enter a mobile number, e.g. 98765 43210'),
  name: z.string().trim().max(120),
});
type Values = z.infer<typeof schema>;

function randomIndianMobile(): string {
  const rest = Array.from({ length: 9 }, () => Math.floor(Math.random() * 10)).join('');
  return `9${rest}`;
}

/** Start a chat with the AI employee, playing the part of a buyer. */
export function StartTestChat() {
  const router = useRouter();
  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { phone: '', name: '' },
  });
  const start = useMutation({
    mutationFn: (v: Values) =>
      api<ConversationDto>('/conversations', {
        method: 'POST',
        body: { phone: v.phone, ...(v.name.trim().length >= 2 ? { name: v.name.trim() } : {}) },
      }),
    onSuccess: (c) => router.push(`/dashboard/conversations?id=${c.id}`),
    onError: (error) => {
      if (!applyFieldErrors(error, form.setError)) {
        form.setError('root', {
          message: error instanceof ApiError ? error.message : 'Could not start the chat',
        });
      }
    },
  });

  return (
    <Panel className="h-fit overflow-hidden">
      <div className="bg-gradient-to-br from-brand to-brand-deep px-6 py-6 text-white">
        <MessagesSquare className="size-6 text-gold-light" aria-hidden />
        <h2 className="mt-3 text-lg font-semibold">Chat as a buyer</h2>
        <p className="mt-1 text-sm leading-relaxed text-brand-line">
          Pretend to be a buyer and message your AI employee. It will reply from your listings and
          build the lead profile live. Nothing is sent to anyone.
        </p>
      </div>
      <form
        noValidate
        className="space-y-4 p-6"
        onSubmit={form.handleSubmit((v) => start.mutate(v))}
      >
        {form.formState.errors.root && (
          <Alert tone="danger">{form.formState.errors.root.message}</Alert>
        )}
        <Field
          label="Buyer’s mobile number"
          error={form.formState.errors.phone?.message}
          hint="A lead is created for this number, or reused if it already exists."
        >
          {(c) => (
            <div className="flex gap-2">
              <Input
                {...c}
                type="tel"
                inputMode="tel"
                placeholder="98765 43210"
                {...form.register('phone')}
              />
              <Button
                type="button"
                variant="secondary"
                size="icon"
                className="size-10 shrink-0"
                aria-label="Use a random test number"
                title="Use a random test number"
                onClick={() =>
                  form.setValue('phone', randomIndianMobile(), { shouldValidate: true })
                }
              >
                <Shuffle />
              </Button>
            </div>
          )}
        </Field>
        <Field label="Buyer’s name" optional>
          {(c) => (
            <Input {...c} placeholder="Leave empty to let the AI ask" {...form.register('name')} />
          )}
        </Field>
        <Button type="submit" className="w-full" size="lg" loading={start.isPending}>
          Start test chat
        </Button>
      </form>
    </Panel>
  );
}
