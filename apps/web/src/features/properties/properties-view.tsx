'use client';

import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  type AddSampleListingsResult,
  formatInr,
  Permission,
  PROPERTY_STATUS_LABELS,
  PROPERTY_TYPE_LABELS,
  type PropertyDto,
  PropertyStatus,
  PropertyType,
} from '@rea/shared-types';
import {
  BadgeCheck,
  BedDouble,
  Building2,
  MapPin,
  Pencil,
  Plus,
  Ruler,
  Sparkles,
  Upload,
} from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { PageHeader } from '@/components/layout/dashboard-shell';
import { EmptyState, ErrorState } from '@/components/states/states';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input, Select } from '@/components/ui/input';
import { Panel } from '@/components/ui/panel';
import { Skeleton } from '@/components/ui/skeleton';
import { usePermission } from '@/hooks/use-permission';
import { api, apiPage, ApiError } from '@/lib/api-client';
import { queryKeys } from '@/lib/query-keys';
import { ImportListingsDialog } from './import-dialog';
import { PropertyFormDialog } from './property-form-dialog';

const PAGE_SIZE = 12;

const STATUS_TONE: Record<PropertyStatus, 'success' | 'warning' | 'neutral' | 'danger' | 'ink'> = {
  AVAILABLE: 'success',
  ON_HOLD: 'warning',
  SOLD: 'ink',
  RENTED: 'ink',
  ARCHIVED: 'neutral',
};

function PropertyCard({ property, onEdit }: { property: PropertyDto; onEdit?: () => void }) {
  return (
    <article className="group flex flex-col overflow-hidden rounded-[var(--radius-panel)] border border-line bg-white shadow-[var(--shadow-soft)] transition-shadow hover:shadow-[var(--shadow-lift)]">
      <div className="relative bg-gradient-to-br from-brand via-brand-hover to-brand-deep px-5 pb-5 pt-4 text-white">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-brand-line">
            {PROPERTY_TYPE_LABELS[property.propertyType]} ·{' '}
            {property.listingType === 'RENT' ? 'Rent' : 'Sale'}
          </span>
          <Badge tone={STATUS_TONE[property.status]}>
            {PROPERTY_STATUS_LABELS[property.status]}
          </Badge>
        </div>
        <p className="mt-5 font-display text-3xl font-bold text-gold-light">
          {formatInr(property.price)}
          {property.listingType === 'RENT' && (
            <span className="text-base text-brand-line"> /month</span>
          )}
        </p>
      </div>
      <div className="flex flex-1 flex-col p-5">
        <h3 className="font-semibold leading-snug text-fg">{property.title}</h3>
        {property.projectName && (
          <p className="mt-0.5 text-sm text-fg-muted">{property.projectName}</p>
        )}
        <p className="mt-2 flex items-center gap-1.5 text-sm text-fg-secondary">
          <MapPin className="size-3.5 text-gold-deep" aria-hidden />
          {[property.locality, property.city].filter(Boolean).join(', ')}
        </p>
        <ul className="mt-4 flex flex-wrap gap-2 text-xs text-fg-secondary">
          {property.bedrooms !== null && (
            <li className="flex items-center gap-1 rounded-full bg-canvas px-2.5 py-1">
              <BedDouble className="size-3.5" aria-hidden /> {property.bedrooms} BHK
            </li>
          )}
          {property.carpetAreaSqft && (
            <li className="flex items-center gap-1 rounded-full bg-canvas px-2.5 py-1">
              <Ruler className="size-3.5" aria-hidden />{' '}
              {property.carpetAreaSqft.toLocaleString('en-IN')} sq ft
            </li>
          )}
          {property.possessionStatus && (
            <li className="rounded-full bg-canvas px-2.5 py-1">
              {property.possessionStatus === 'READY_TO_MOVE'
                ? 'Ready to move'
                : 'Under construction'}
            </li>
          )}
          {property.reraNumber && (
            <li className="flex items-center gap-1 rounded-full bg-success-soft px-2.5 py-1 font-semibold text-success">
              <BadgeCheck className="size-3.5" aria-hidden /> RERA
            </li>
          )}
        </ul>
        {onEdit && (
          <div className="mt-auto pt-5">
            <Button
              variant="secondary"
              size="sm"
              onClick={onEdit}
              aria-label={`Edit ${property.title}`}
            >
              <Pencil /> Edit
            </Button>
          </div>
        )}
      </div>
    </article>
  );
}

export function PropertiesView() {
  const canWrite = usePermission(Permission.PROPERTIES_WRITE);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [type, setType] = useState('');
  const [sort, setSort] = useState('newest');
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState<PropertyDto | undefined>();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const queryClient = useQueryClient();
  const samples = useMutation({
    mutationFn: () => api<AddSampleListingsResult>('/properties/samples', { method: 'POST' }),
    onSuccess: (r) => {
      void queryClient.invalidateQueries({ queryKey: ['properties'] });
      void queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      toast.success(`${r.created} sample listings added. Try asking the AI about them.`);
    },
    onError: (err) =>
      toast.error(err instanceof ApiError ? err.message : 'Could not add sample listings.'),
  });

  const params = new URLSearchParams({
    page: String(page),
    pageSize: String(PAGE_SIZE),
    sort,
    ...(search ? { q: search } : {}),
    ...(status ? { status } : {}),
    ...(type ? { propertyType: type } : {}),
  }).toString();
  const properties = useQuery({
    queryKey: queryKeys.properties(params),
    queryFn: () => apiPage<PropertyDto>(`/properties?${params}`),
    placeholderData: keepPreviousData,
  });
  const openDialog = (property?: PropertyDto) => {
    setEditing(property);
    setDialogOpen(true);
  };
  const reset =
    <T,>(setter: (v: T) => void) =>
    (v: T) => {
      setter(v);
      setPage(1);
    };

  return (
    <>
      <PageHeader
        title="Properties"
        description="Your verified inventory. The AI employee recommends only what is listed here as available."
        actions={
          canWrite ? (
            <div className="flex flex-wrap gap-2">
              <Button variant="secondary" onClick={() => setImportOpen(true)}>
                <Upload /> Import CSV
              </Button>
              <Button onClick={() => openDialog()}>
                <Plus /> Add listing
              </Button>
            </div>
          ) : undefined
        }
      />

      <Panel className="mb-6 flex flex-wrap items-center gap-3 p-4">
        <Input
          type="search"
          placeholder="Search title, project, locality or city"
          aria-label="Search properties"
          className="h-9 min-w-56 flex-1"
          value={search}
          onChange={(e) => reset(setSearch)(e.target.value)}
        />
        <Select
          aria-label="Status"
          className="h-9 w-40"
          value={status}
          onChange={(e) => reset(setStatus)(e.target.value)}
        >
          <option value="">All active</option>
          {Object.values(PropertyStatus).map((s) => (
            <option key={s} value={s}>
              {PROPERTY_STATUS_LABELS[s]}
            </option>
          ))}
        </Select>
        <Select
          aria-label="Property type"
          className="h-9 w-44"
          value={type}
          onChange={(e) => reset(setType)(e.target.value)}
        >
          <option value="">All types</option>
          {Object.values(PropertyType).map((t) => (
            <option key={t} value={t}>
              {PROPERTY_TYPE_LABELS[t]}
            </option>
          ))}
        </Select>
        <Select
          aria-label="Sort"
          className="h-9 w-44"
          value={sort}
          onChange={(e) => reset(setSort)(e.target.value)}
        >
          <option value="newest">Newest first</option>
          <option value="price_asc">Price: low to high</option>
          <option value="price_desc">Price: high to low</option>
        </Select>
      </Panel>

      {properties.isError ? (
        <ErrorState error={properties.error} onRetry={() => void properties.refetch()} />
      ) : !properties.data ? (
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }, (_, i) => (
            <Skeleton key={i} className="h-72 rounded-[var(--radius-panel)]" />
          ))}
        </div>
      ) : properties.data.data.length === 0 ? (
        <Panel>
          <EmptyState
            icon={Building2}
            title={search || status || type ? 'No listings match' : 'Add your first listing'}
            description={
              search || status || type
                ? 'Try a different search or filter.'
                : 'Once your inventory is here, your AI employee can recommend real, available properties to buyers.'
            }
            action={
              canWrite && !search && !status && !type ? (
                <div className="flex flex-wrap justify-center gap-2">
                  <Button onClick={() => openDialog()}>
                    <Plus /> Add listing
                  </Button>
                  <Button variant="secondary" onClick={() => setImportOpen(true)}>
                    <Upload /> Import CSV
                  </Button>
                  <Button
                    variant="secondary"
                    loading={samples.isPending}
                    onClick={() => samples.mutate()}
                  >
                    <Sparkles /> Add sample listings
                  </Button>
                </div>
              ) : undefined
            }
          />
        </Panel>
      ) : (
        <>
          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {properties.data.data.map((property) => (
              <PropertyCard
                key={property.id}
                property={property}
                onEdit={canWrite ? () => openDialog(property) : undefined}
              />
            ))}
          </div>
          {properties.data.meta.totalPages > 1 && (
            <div className="mt-6 flex items-center justify-between text-sm text-fg-muted">
              <span>
                Page {properties.data.meta.page} of {properties.data.meta.totalPages} ·{' '}
                {properties.data.meta.total} listings
              </span>
              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage(page - 1)}
                >
                  Previous
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={page >= properties.data.meta.totalPages}
                  onClick={() => setPage(page + 1)}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </>
      )}

      {canWrite && (
        <>
          <PropertyFormDialog property={editing} open={dialogOpen} onOpenChange={setDialogOpen} />
          <ImportListingsDialog open={importOpen} onOpenChange={setImportOpen} />
        </>
      )}
    </>
  );
}
