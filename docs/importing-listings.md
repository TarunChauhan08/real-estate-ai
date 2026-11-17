# Importing listings

Businesses rarely want to type 200 listings by hand. **Properties → Import CSV** takes the
spreadsheet they already keep.

## How it works

1. Save the sheet as CSV (Excel: _Save As → CSV UTF-8_; Google Sheets: _File → Download → CSV_).
2. Upload it. The file is **checked first** (`dryRun: true`) and problems are listed by
   spreadsheet row number, e.g. "Row 14 · Price · Enter a price…".
3. When every row is valid, **Import N listings** creates them in one transaction.

Import is **all-or-nothing**: a sheet is never half-imported, so re-uploading after a fix can't
create duplicates of the rows that worked the first time.

## Format

- Required columns: **Title, Property type, Price, City**. Everything else is optional.
- Headers are matched loosely: `BHK` / `Bedrooms`, `Carpet area (sq ft)` / `Area`,
  `Locality` / `Sector` / `Area name`… Unknown columns are ignored and named in the result.
- Prices may be written the Indian way: `85 lakh`, `1.2 cr`, `₹85,00,000`, `28k`.
- Property type accepts common words (`Flat` → Apartment, `Independent house`, `Plot`…).
- Amenities are separated by `;` or `|` (commas would clash with CSV).
- Limits: 1,000 rows and 2 MB per file.

A template with two example rows is available from the dialog (**Download template**); it is
built in the browser from `LISTING_IMPORT_COLUMNS` in `@rea/shared-types`.

## Sample listings

**Add sample listings** (shown while the inventory is empty) creates six realistic listings in
the business's city, titled `Sample · …`, so the AI employee can be tried in minutes. It can be
used once per business; samples can be edited or archived like any listing.

## API

| Endpoint                                            | Permission         | Notes                                                                                                               |
| --------------------------------------------------- | ------------------ | ------------------------------------------------------------------------------------------------------------------- |
| `POST /api/v1/properties/import` `{ csv, dryRun? }` | `properties:write` | 200 with `{ total, valid, created, errors[], ignoredColumns[] }`; 400 for missing columns, empty or oversized files |
| `POST /api/v1/properties/samples`                   | `properties:write` | 201 `{ created: 6 }`; 409 `SAMPLES_EXIST`                                                                           |

Both write an audit entry (`property.imported`, `property.samples_added`).
