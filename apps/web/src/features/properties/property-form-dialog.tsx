'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  formatInr,
  PROPERTY_STATUS_LABELS,
  PROPERTY_TYPE_LABELS,
  type PropertyDto,
  PropertyStatus,
  PropertyType,
} from '@rea/shared-types';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Field } from '@/components/ui/field';
import { Input, Select, Textarea } from '@/components/ui/input';
import { parseRupees } from '@/features/leads/format';
import { api, ApiError, applyFieldErrors } from '@/lib/api-client';

const optionalInt = (max: number, label: string) =>
  z
    .string()
    .trim()
    .refine(
      (v) => v === '' || (/^\d+$/.test(v) && Number(v) <= max),
      `Enter a whole number up to ${max} for ${label}`,
    );

const schema = z
  .object({
    title: z.string().trim().min(3, 'Give the listing a title (at least 3 characters)').max(160),
    projectName: z.string().trim().max(160),
    propertyType: z.string().min(1),
    listingType: z.enum(['SALE', 'RENT']),
    status: z.string(),
    price: z.string().trim().min(1, 'Enter the price, e.g. 85 lakh or 1.2 cr'),
    bedrooms: optionalInt(20, 'BHK'),
    bathrooms: optionalInt(20, 'bathrooms'),
    carpetAreaSqft: optionalInt(1_000_000, 'carpet area'),
    locality: z.string().trim().max(120),
    city: z.string().trim().min(2, 'Enter the city').max(100),
    state: z.string().trim().max(100),
    pincode: z
      .string()
      .trim()
      .refine((v) => v === '' || /^[1-9]\d{5}$/.test(v), 'Enter a 6-digit PIN code'),
    possessionStatus: z.string(),
    possessionDate: z.string(),
    reraNumber: z.string().trim().max(60),
    amenities: z.string(),
    description: z.string().trim().max(5000),
  })
  .superRefine((values, ctx) => {
    const price = parseRupees(values.price);
    if (price === null || Number.isNaN(price) || price < 1) {
      ctx.addIssue({
        code: 'custom',
        path: ['price'],
        message: 'Enter a price like 8500000, 85 lakh or 1.2 cr',
      });
    }
  });
type Values = z.infer<typeof schema>;

const emptyToNull = (v: string) => (v.trim() === '' ? null : v.trim());
const intOrNull = (v: string) => (v.trim() === '' ? null : Number(v));

function toDefaults(p?: PropertyDto): Values {
  return {
    title: p?.title ?? '',
    projectName: p?.projectName ?? '',
    propertyType: p?.propertyType ?? PropertyType.APARTMENT,
    listingType: p?.listingType ?? 'SALE',
    status: p?.status ?? PropertyStatus.AVAILABLE,
    price: p ? String(p.price) : '',
    bedrooms: p?.bedrooms?.toString() ?? '',
    bathrooms: p?.bathrooms?.toString() ?? '',
    carpetAreaSqft: p?.carpetAreaSqft?.toString() ?? '',
    locality: p?.locality ?? '',
    city: p?.city ?? '',
    state: p?.state ?? '',
    pincode: p?.pincode ?? '',
    possessionStatus: p?.possessionStatus ?? '',
    possessionDate: p?.possessionDate ?? '',
    reraNumber: p?.reraNumber ?? '',
    amenities: p?.amenities.join(', ') ?? '',
    description: p?.description ?? '',
  };
}

export function PropertyFormDialog({
  property,
  open,
  onOpenChange,
}: {
  property?: PropertyDto;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const queryClient = useQueryClient();
  const editing = Boolean(property);
  const form = useForm<Values>({ resolver: zodResolver(schema), values: toDefaults(property) });
  const [pricePreview, setPricePreview] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: (values: Values) => {
      const body = {
        title: values.title,
        projectName: emptyToNull(values.projectName),
        propertyType: values.propertyType,
        listingType: values.listingType,
        price: parseRupees(values.price),
        bedrooms: intOrNull(values.bedrooms),
        bathrooms: intOrNull(values.bathrooms),
        carpetAreaSqft: intOrNull(values.carpetAreaSqft),
        locality: emptyToNull(values.locality),
        city: values.city,
        state: emptyToNull(values.state),
        pincode: emptyToNull(values.pincode),
        possessionStatus: emptyToNull(values.possessionStatus),
        possessionDate: emptyToNull(values.possessionDate),
        reraNumber: emptyToNull(values.reraNumber),
        amenities: values.amenities
          .split(',')
          .map((a) => a.trim())
          .filter(Boolean),
        description: emptyToNull(values.description),
        ...(editing ? { status: values.status } : {}),
      };
      return property
        ? api<PropertyDto>(`/properties/${property.id}`, { method: 'PATCH', body })
        : api<PropertyDto>('/properties', { method: 'POST', body });
    },
    onSuccess: (saved) => {
      toast.success(editing ? `${saved.title} updated` : `${saved.title} added to your inventory`);
      void queryClient.invalidateQueries({ queryKey: ['properties'] });
      void queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      onOpenChange(false);
    },
    onError: (error) => {
      if (!applyFieldErrors(error, form.setError)) {
        form.setError('root', {
          message: error instanceof ApiError ? error.message : 'The listing was not saved',
        });
      }
    },
  });

  const e = form.formState.errors;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        title={editing ? 'Edit listing' : 'Add a listing'}
        description="Your AI employee only ever recommends listings from this inventory."
        className="max-h-[92vh] max-w-2xl overflow-y-auto"
      >
        <form
          noValidate
          className="space-y-5"
          onSubmit={form.handleSubmit((values) => mutation.mutate(values))}
        >
          {e.root && <Alert tone="danger">{e.root.message}</Alert>}
          <Field
            label="Title"
            error={e.title?.message}
            hint="What a buyer would search for, e.g. “3 BHK with park view, Sector 150”"
          >
            {(c) => <Input {...c} {...form.register('title')} />}
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Property type">
              {(c) => (
                <Select {...c} {...form.register('propertyType')}>
                  {Object.values(PropertyType).map((t) => (
                    <option key={t} value={t}>
                      {PROPERTY_TYPE_LABELS[t]}
                    </option>
                  ))}
                </Select>
              )}
            </Field>
            <Field label="Listed for">
              {(c) => (
                <Select {...c} {...form.register('listingType')}>
                  <option value="SALE">Sale</option>
                  <option value="RENT">Rent</option>
                </Select>
              )}
            </Field>
            <Field
              label={form.watch('listingType') === 'RENT' ? 'Monthly rent' : 'Price'}
              error={e.price?.message}
              hint={pricePreview ?? 'Type 85 lakh, 1.2 cr or the full amount'}
            >
              {(c) => (
                <Input
                  {...c}
                  inputMode="decimal"
                  {...form.register('price', {
                    onChange: (ev: React.ChangeEvent<HTMLInputElement>) => {
                      const value = parseRupees(ev.target.value);
                      setPricePreview(
                        value && !Number.isNaN(value) ? `= ${formatInr(value)}` : null,
                      );
                    },
                  })}
                />
              )}
            </Field>
            <Field label="Project / society" optional>
              {(c) => <Input {...c} {...form.register('projectName')} />}
            </Field>
            <Field label="BHK" optional error={e.bedrooms?.message}>
              {(c) => <Input {...c} inputMode="numeric" {...form.register('bedrooms')} />}
            </Field>
            <Field label="Bathrooms" optional error={e.bathrooms?.message}>
              {(c) => <Input {...c} inputMode="numeric" {...form.register('bathrooms')} />}
            </Field>
            <Field label="Carpet area (sq ft)" optional error={e.carpetAreaSqft?.message}>
              {(c) => <Input {...c} inputMode="numeric" {...form.register('carpetAreaSqft')} />}
            </Field>
            <Field label="Locality / sector" optional>
              {(c) => <Input {...c} {...form.register('locality')} />}
            </Field>
            <Field label="City" error={e.city?.message}>
              {(c) => <Input {...c} {...form.register('city')} />}
            </Field>
            <Field label="State" optional>
              {(c) => <Input {...c} {...form.register('state')} />}
            </Field>
            <Field label="PIN code" optional error={e.pincode?.message}>
              {(c) => <Input {...c} inputMode="numeric" {...form.register('pincode')} />}
            </Field>
            <Field label="RERA number" optional hint="Shown to buyers as a trust signal">
              {(c) => <Input {...c} {...form.register('reraNumber')} />}
            </Field>
            <Field label="Possession" optional>
              {(c) => (
                <Select {...c} {...form.register('possessionStatus')}>
                  <option value="">Not specified</option>
                  <option value="READY_TO_MOVE">Ready to move</option>
                  <option value="UNDER_CONSTRUCTION">Under construction</option>
                </Select>
              )}
            </Field>
            <Field label="Possession date" optional error={e.possessionDate?.message}>
              {(c) => <Input {...c} type="date" {...form.register('possessionDate')} />}
            </Field>
            {editing && (
              <Field label="Status">
                {(c) => (
                  <Select {...c} {...form.register('status')}>
                    {Object.values(PropertyStatus).map((s) => (
                      <option key={s} value={s}>
                        {PROPERTY_STATUS_LABELS[s]}
                      </option>
                    ))}
                  </Select>
                )}
              </Field>
            )}
          </div>
          <Field
            label="Amenities"
            optional
            hint="Separate with commas: Gym, Swimming pool, Power backup"
          >
            {(c) => <Input {...c} {...form.register('amenities')} />}
          </Field>
          <Field label="Description" optional>
            {(c) => <Textarea {...c} rows={3} {...form.register('description')} />}
          </Field>
          <div className="flex justify-end gap-2 border-t border-line pt-4">
            <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={mutation.isPending}>
              {editing ? 'Save changes' : 'Add listing'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
