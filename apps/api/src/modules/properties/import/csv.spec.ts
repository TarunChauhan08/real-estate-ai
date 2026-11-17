import { mapHeader, parseAmount, parseCsv, parseListingsCsv, toPropertyInput } from './csv';

describe('parseCsv', () => {
  it('handles quotes, commas and line breaks inside fields, CRLF and Excel’s BOM', () => {
    const text =
      '﻿title,description\r\n"3 BHK, Sector 150","Big ""corner"" flat\nwith park view"\r\n';
    expect(parseCsv(text)).toEqual([
      ['title', 'description'],
      ['3 BHK, Sector 150', 'Big "corner" flat\nwith park view'],
    ]);
  });

  it('skips blank rows and keeps empty cells', () => {
    expect(parseCsv('a,b,c\n\n1,,3\n,,\n')).toEqual([
      ['a', 'b', 'c'],
      ['1', '', '3'],
    ]);
  });
});

describe('parseAmount', () => {
  it.each([
    ['85 lakh', 8_500_000],
    ['85 Lakhs', 8_500_000],
    ['₹1.2 Cr', 12_000_000],
    ['1.25 crore', 12_500_000],
    ['85,00,000', 8_500_000],
    ['Rs. 45 L', 4_500_000],
    ['25k', 25_000],
    ['25,000 per month', 25_000],
    ['8500000', 8_500_000],
  ])('%s → %d', (input, expected) => {
    expect(parseAmount(input)).toBe(expected);
  });

  it('refuses text it cannot read', () => {
    expect(parseAmount('on request')).toBeNull();
    expect(parseAmount('')).toBeNull();
  });
});

describe('mapping columns and values', () => {
  it('understands common header names', () => {
    expect(mapHeader(' Property Type ')).toBe('propertyType');
    expect(mapHeader('BHK')).toBe('bedrooms');
    expect(mapHeader('Price (₹)')).toBe('price');
    expect(mapHeader('RERA No')).toBe('reraNumber');
    expect(mapHeader('Owner phone')).toBeNull();
  });

  it('normalises how people describe listings', () => {
    expect(
      toPropertyInput({
        propertyType: 'Flat',
        listingType: 'Rent',
        bedrooms: '3 BHK',
        carpetAreaSqft: '1,450 sq ft',
        possessionStatus: 'Ready to move',
        amenities: 'Gym; Pool | Clubhouse',
        price: '35k',
        city: ' Noida ',
        description: '',
      }),
    ).toEqual({
      propertyType: 'APARTMENT',
      listingType: 'RENT',
      bedrooms: 3,
      carpetAreaSqft: 1450,
      possessionStatus: 'READY_TO_MOVE',
      amenities: ['Gym', 'Pool', 'Clubhouse'],
      price: 35_000,
      city: 'Noida',
    });
  });

  it('passes unreadable values through so validation can explain them', () => {
    expect(toPropertyInput({ propertyType: 'Castle', price: 'on request' })).toEqual({
      propertyType: 'CASTLE',
      price: 'on request',
    });
  });
});

describe('parseListingsCsv', () => {
  it('numbers rows like the spreadsheet and reports ignored columns', () => {
    const sheet = parseListingsCsv(
      'Title,Type,Price,City,Owner phone\n3 BHK Sector 150,Apartment,85 lakh,Noida,98765\nVilla,Villa,2.5 cr,Gurugram,\n',
    );
    expect(sheet.ignoredHeaders).toEqual(['Owner phone']);
    expect(sheet.rows).toEqual([
      {
        rowNumber: 2,
        input: {
          title: '3 BHK Sector 150',
          propertyType: 'APARTMENT',
          price: 8_500_000,
          city: 'Noida',
        },
      },
      {
        rowNumber: 3,
        input: { title: 'Villa', propertyType: 'VILLA', price: 25_000_000, city: 'Gurugram' },
      },
    ]);
  });
});
