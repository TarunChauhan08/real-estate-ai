'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  type ImportListingsResult,
  LISTING_IMPORT_COLUMNS,
  LISTING_IMPORT_MAX_ROWS,
} from '@rea/shared-types';
import { Download, FileSpreadsheet } from 'lucide-react';
import { useId, useState } from 'react';
import { toast } from 'sonner';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { api, ApiError } from '@/lib/api-client';

const FIELD_LABELS: Record<string, string> = {
  title: 'Title',
  projectName: 'Project name',
  propertyType: 'Property type',
  listingType: 'Listing type',
  bedrooms: 'BHK',
  bathrooms: 'Bathrooms',
  carpetAreaSqft: 'Carpet area',
  price: 'Price',
  locality: 'Locality',
  city: 'City',
  state: 'State',
  pincode: 'PIN code',
  possessionStatus: 'Possession status',
  possessionDate: 'Possession date',
  reraNumber: 'RERA number',
  amenities: 'Amenities',
  description: 'Description',
};

const TEMPLATE_ROWS = [
  [
    '3 BHK in Sector 150',
    'Apartment',
    'Sale',
    '1.2 cr',
    'Noida',
    'Sector 150',
    '3',
    '3',
    '1450',
    'Ready to move',
    '',
    'Sample Residences',
    'UPRERAPRJ000000',
    'Gym; Swimming pool; Power backup',
    'Corner unit with park view',
  ],
  [
    '2 BHK for rent',
    'Apartment',
    'Rent',
    '28000',
    'Noida',
    'Sector 62',
    '2',
    '2',
    '1050',
    'Ready to move',
    '',
    '',
    '',
    'Lift; Covered parking',
    '',
  ],
];

const csvCell = (v: string) => (/[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);

/** Builds the template in the browser — no server round trip, works offline. */
export function downloadTemplate() {
  const csv = [LISTING_IMPORT_COLUMNS as readonly string[], ...TEMPLATE_ROWS]
    .map((row) => row.map(csvCell).join(','))
    .join('\r\n');
  const url = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = 'listings-template.csv';
  a.click();
  URL.revokeObjectURL(url);
}

type Stage =
  | { kind: 'pick' }
  | { kind: 'checked'; fileName: string; csv: string; result: ImportListingsResult };

/**
 * Two steps: choose a file → we check it (dry run) and show any problems by row → import.
 * Nothing is created until every row is valid, so a half-imported sheet can't happen.
 */
export function ImportListingsDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const queryClient = useQueryClient();
  const inputId = useId();
  const [stage, setStage] = useState<Stage>({ kind: 'pick' });
  const [error, setError] = useState<string | null>(null);

  const close = (next: boolean) => {
    onOpenChange(next);
    if (!next) {
      setStage({ kind: 'pick' });
      setError(null);
    }
  };

  const check = useMutation({
    mutationFn: async (file: File) => {
      if (file.size > 2 * 1024 * 1024)
        throw new Error('The file is larger than 2 MB. Split it into smaller files.');
      const csv = await file.text();
      const result = await api<ImportListingsResult>('/properties/import', {
        method: 'POST',
        body: { csv, dryRun: true },
      });
      return { fileName: file.name, csv, result };
    },
    onMutate: () => setError(null),
    onSuccess: (checked) => setStage({ kind: 'checked', ...checked }),
    onError: (err) => setError(err instanceof Error ? err.message : 'Could not read the file.'),
  });

  const run = useMutation({
    mutationFn: (csv: string) =>
      api<ImportListingsResult>('/properties/import', { method: 'POST', body: { csv } }),
    onSuccess: (result) => {
      void queryClient.invalidateQueries({ queryKey: ['properties'] });
      void queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      toast.success(`${result.created} ${result.created === 1 ? 'listing' : 'listings'} imported`);
      close(false);
    },
    onError: (err) =>
      setError(err instanceof ApiError ? err.message : 'Import failed. Please try again.'),
  });

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent
        title="Import listings from a spreadsheet"
        description="Upload a CSV file. Save from Excel or Google Sheets with File → Download → CSV."
        className="max-w-2xl"
      >
        <div className="space-y-4">
          {error && <Alert tone="danger">{error}</Alert>}

          {stage.kind === 'pick' ? (
            <>
              <label
                htmlFor={inputId}
                className="flex cursor-pointer flex-col items-center gap-2 rounded-[var(--radius-panel)] border-2 border-dashed border-line px-6 py-10 text-center hover:border-brand hover:bg-brand-soft/40"
              >
                <FileSpreadsheet className="size-8 text-brand" aria-hidden />
                <span className="font-medium text-fg">
                  {check.isPending ? 'Checking your file…' : 'Choose a CSV file'}
                </span>
                <span className="text-sm text-fg-muted">
                  Up to {LISTING_IMPORT_MAX_ROWS.toLocaleString('en-IN')} listings · prices like “85
                  lakh” or “1.2 cr” are fine
                </span>
              </label>
              <input
                id={inputId}
                type="file"
                accept=".csv,text/csv"
                className="sr-only"
                aria-label="CSV file"
                disabled={check.isPending}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  e.target.value = '';
                  if (file) check.mutate(file);
                }}
              />
              <p className="text-sm text-fg-muted">
                Required columns: <strong>Title</strong>, <strong>Property type</strong>,{' '}
                <strong>Price</strong> and <strong>City</strong>. Everything else is optional.
              </p>
              <Button type="button" variant="secondary" onClick={downloadTemplate}>
                <Download /> Download template
              </Button>
            </>
          ) : (
            <CheckedSummary
              stage={stage}
              importing={run.isPending}
              onImport={() => run.mutate(stage.csv)}
              onPickAnother={() => {
                setStage({ kind: 'pick' });
                setError(null);
              }}
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function CheckedSummary({
  stage,
  importing,
  onImport,
  onPickAnother,
}: {
  stage: Extract<Stage, { kind: 'checked' }>;
  importing: boolean;
  onImport: () => void;
  onPickAnother: () => void;
}) {
  const { result, fileName } = stage;
  const ok = result.errors.length === 0;
  const badRows = new Set(result.errors.map((e) => e.row)).size;
  return (
    <>
      {ok ? (
        <Alert tone="success">
          {fileName}: all {result.total} {result.total === 1 ? 'listing is' : 'listings are'} ready
          to import.
        </Alert>
      ) : (
        <Alert tone="warning">
          {fileName}: {badRows} {badRows === 1 ? 'row needs' : 'rows need'} fixing before anything
          can be imported. Fix them in your spreadsheet and upload it again.
        </Alert>
      )}
      {result.ignoredColumns.length > 0 && (
        <p className="text-sm text-fg-muted">
          Ignored columns we don’t recognise: {result.ignoredColumns.join(', ')}
        </p>
      )}
      {!ok && (
        <div className="max-h-64 overflow-auto rounded-md border border-line">
          <table className="w-full text-left text-sm">
            <caption className="sr-only">Rows with problems</caption>
            <thead className="sticky top-0 bg-subtle text-fg-muted">
              <tr>
                <th className="px-3 py-2 font-medium">Row</th>
                <th className="px-3 py-2 font-medium">Column</th>
                <th className="px-3 py-2 font-medium">Problem</th>
              </tr>
            </thead>
            <tbody>
              {result.errors.slice(0, 200).map((e, i) => (
                <tr key={i} className="border-t border-line">
                  <td className="px-3 py-2 tabular-nums">{e.row}</td>
                  <td className="px-3 py-2">{FIELD_LABELS[e.field] ?? e.field}</td>
                  <td className="px-3 py-2">{e.message}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <div className="flex justify-end gap-2 border-t border-line pt-4">
        <Button type="button" variant="secondary" onClick={onPickAnother}>
          Choose another file
        </Button>
        {ok && (
          <Button type="button" loading={importing} onClick={onImport}>
            Import {result.total} {result.total === 1 ? 'listing' : 'listings'}
          </Button>
        )}
      </div>
    </>
  );
}
