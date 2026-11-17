export interface ImportListingsRequest {
  /** The CSV file's text. First row = column headers. */
  csv: string;
  /** Check only; create nothing. */
  dryRun?: boolean;
}

export interface ImportRowError {
  /** Spreadsheet row number (the header is row 1). */
  row: number;
  field: string;
  message: string;
}

export interface ImportListingsResult {
  /** Data rows in the file. */
  total: number;
  /** Rows that passed validation. */
  valid: number;
  /** Listings created (0 for a dry run or when any row has errors). */
  created: number;
  errors: ImportRowError[];
  /** Columns that were not recognised and therefore ignored. */
  ignoredColumns: string[];
}

/** Columns of the downloadable template, in order. */
export const LISTING_IMPORT_COLUMNS = [
  'Title',
  'Property type',
  'Listing type',
  'Price',
  'City',
  'Locality',
  'BHK',
  'Bathrooms',
  'Carpet area (sq ft)',
  'Possession status',
  'Possession date',
  'Project name',
  'RERA number',
  'Amenities',
  'Description',
] as const;

export const LISTING_IMPORT_MAX_ROWS = 1000;

export interface AddSampleListingsResult {
  created: number;
}
