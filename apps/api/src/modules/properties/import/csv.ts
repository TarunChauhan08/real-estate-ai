/**
 * Turning a spreadsheet of listings into property records.
 * Pure functions, no I/O: easy to test against the messy CSVs real businesses export.
 */

/** RFC 4180 CSV: quoted fields, doubled quotes, commas and newlines inside quotes, CRLF or LF. */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let quoted = false;
  const input = text.replace(/^\uFEFF/, ''); // Excel's UTF-8 byte-order mark

  for (let i = 0; i < input.length; i += 1) {
    const ch = input[i]!;
    if (quoted) {
      if (ch === '"') {
        if (input[i + 1] === '"') {
          field += '"';
          i += 1;
        } else quoted = false;
      } else field += ch;
      continue;
    }
    if (ch === '"' && field === '') quoted = true;
    else if (ch === ',') {
      row.push(field);
      field = '';
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && input[i + 1] === '\n') i += 1;
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else field += ch;
  }
  if (field !== '' || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  // Drop rows that are completely empty (trailing newlines, spacer rows).
  return rows.filter((r) => r.some((cell) => cell.trim() !== ''));
}

/** Column headers people actually use → our field names. */
const HEADER_ALIASES: Record<string, string> = {
  title: 'title',
  name: 'title',
  'property name': 'title',
  listing: 'title',
  project: 'projectName',
  'project name': 'projectName',
  projectname: 'projectName',
  type: 'propertyType',
  'property type': 'propertyType',
  propertytype: 'propertyType',
  'listing type': 'listingType',
  listingtype: 'listingType',
  'sale/rent': 'listingType',
  for: 'listingType',
  bhk: 'bedrooms',
  bedrooms: 'bedrooms',
  beds: 'bedrooms',
  bathrooms: 'bathrooms',
  baths: 'bathrooms',
  area: 'carpetAreaSqft',
  'carpet area': 'carpetAreaSqft',
  'carpet area (sq ft)': 'carpetAreaSqft',
  'area (sq ft)': 'carpetAreaSqft',
  carpetareasqft: 'carpetAreaSqft',
  sqft: 'carpetAreaSqft',
  price: 'price',
  'price (inr)': 'price',
  'price (₹)': 'price',
  rent: 'price',
  'monthly rent': 'price',
  locality: 'locality',
  sector: 'locality',
  area_name: 'locality',
  city: 'city',
  state: 'state',
  pincode: 'pincode',
  'pin code': 'pincode',
  pin: 'pincode',
  possession: 'possessionStatus',
  'possession status': 'possessionStatus',
  possessionstatus: 'possessionStatus',
  'possession date': 'possessionDate',
  possessiondate: 'possessionDate',
  rera: 'reraNumber',
  'rera number': 'reraNumber',
  'rera no': 'reraNumber',
  reranumber: 'reraNumber',
  amenities: 'amenities',
  description: 'description',
  details: 'description',
};

export function mapHeader(header: string): string | null {
  const key = header.trim().toLowerCase().replace(/\s+/g, ' ');
  return HEADER_ALIASES[key] ?? null;
}

/**
 * Indian amounts as people write them: "85 lakh", "₹1.2 Cr", "85,00,000", "25k", "8500000".
 * Returns whole rupees, or null if it cannot be read.
 */
export function parseAmount(value: string): number | null {
  const text = value
    .toLowerCase()
    .replace(/₹|rs\.?|inr|\/-|per month|\/month|pm/g, '')
    .trim();
  if (!text) return null;
  const match = /^([\d,]*\.?\d+)\s*(crores?|cr|lakhs?|lacs?|lac|l|thousand|k)?$/.exec(text);
  if (!match) return null;
  const number = Number(match[1]!.replace(/,/g, ''));
  if (!Number.isFinite(number)) return null;
  const unit = match[2] ?? '';
  const multiplier = unit.startsWith('cr')
    ? 10_000_000
    : /^(lakhs?|lacs?|lac|l)$/.test(unit)
      ? 100_000
      : unit === 'k' || unit === 'thousand'
        ? 1_000
        : 1;
  return Math.round(number * multiplier);
}

const PROPERTY_TYPES: Array<[RegExp, string]> = [
  [/^(apartment|flat|apt)s?$/, 'APARTMENT'],
  [/^(independent house|house|kothi|bungalow)$/, 'INDEPENDENT_HOUSE'],
  [/^villas?$/, 'VILLA'],
  [/^(builder floor|floor)$/, 'BUILDER_FLOOR'],
  [/^(plot|land)s?$/, 'PLOT'],
  [/^(office|commercial office)$/, 'COMMERCIAL_OFFICE'],
  [/^(shop|showroom|retail|commercial shop)$/, 'COMMERCIAL_SHOP'],
  [/^other$/, 'OTHER'],
];

function normaliseEnum(value: string, table: Array<[RegExp, string]>): string {
  const text = value.trim().toLowerCase().replace(/[_-]+/g, ' ').replace(/\s+/g, ' ');
  for (const [pattern, result] of table) if (pattern.test(text)) return result;
  // Unknown values pass through upper-cased so validation reports them clearly.
  return value
    .trim()
    .toUpperCase()
    .replace(/[\s-]+/g, '_');
}

/** Spreadsheet row (header → text) → object shaped like CreatePropertyDto. */
export function toPropertyInput(cells: Record<string, string>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [field, raw] of Object.entries(cells)) {
    const value = raw.trim();
    if (value === '') continue;
    switch (field) {
      case 'price':
        out.price = parseAmount(value) ?? value;
        break;
      case 'bedrooms': {
        const n = /^(\d+)\s*(bhk|rk)?$/i.exec(value);
        out.bedrooms = n ? Number(n[1]) : value;
        break;
      }
      case 'bathrooms':
        out.bathrooms = /^\d+$/.test(value) ? Number(value) : value;
        break;
      case 'carpetAreaSqft': {
        const area = Number(value.replace(/,|sq\.?\s*ft|sqft/gi, '').trim());
        out.carpetAreaSqft = Number.isFinite(area) ? Math.round(area) : value;
        break;
      }
      case 'propertyType':
        out.propertyType = normaliseEnum(value, PROPERTY_TYPES);
        break;
      case 'listingType':
        out.listingType = normaliseEnum(value, [
          [/^(sale|sell|buy|resale|new)$/, 'SALE'],
          [/^(rent|rental|lease)$/, 'RENT'],
        ]);
        break;
      case 'possessionStatus':
        out.possessionStatus = normaliseEnum(value, [
          [/^(ready|ready to move|rtm|ready to move in)$/, 'READY_TO_MOVE'],
          [/^(under construction|uc|new launch)$/, 'UNDER_CONSTRUCTION'],
        ]);
        break;
      case 'amenities':
        out.amenities = value
          .split(/[;|]/)
          .map((a) => a.trim())
          .filter(Boolean);
        break;
      default:
        out[field] = value;
    }
  }
  return out;
}

export interface ParsedSheet {
  /** Our field names, in column order (null = ignored column). */
  fields: Array<string | null>;
  ignoredHeaders: string[];
  rows: Array<{ rowNumber: number; input: Record<string, unknown> }>;
}

/** Whole file → rows ready for validation. Row numbers match the spreadsheet (header = row 1). */
export function parseListingsCsv(text: string): ParsedSheet {
  const [header = [], ...body] = parseCsv(text);
  const fields = header.map(mapHeader);
  const ignoredHeaders = header
    .filter((_, i) => fields[i] === null)
    .map((h) => h.trim())
    .filter(Boolean);
  const rows = body.map((cells, index) => {
    const record: Record<string, string> = {};
    fields.forEach((field, i) => {
      if (field) record[field] = cells[i] ?? '';
    });
    return { rowNumber: index + 2, input: toPropertyInput(record) };
  });
  return { fields, ignoredHeaders, rows };
}
