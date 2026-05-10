export type ImportEntity = 'products' | 'categories' | 'leads';

export const PRODUCT_IMPORT_HEADERS = [
  'product_name',
  'sku_code',
  'brand_name',
  'category',
  'subcategory',
  'pricing_type',
  'active_status',
  'quoteable_status',
  'description',
  'variant_name',
  'variant_code',
  'pack_label',
  'pack_size_value',
  'pack_size_unit',
  'units_per_case',
  'net_weight_kg',
  'moq_cases',
  'moq_kg',
  'pricing_mode_default',
  'supports_bulk_pricing',
  'country_of_origin',
  'shelf_life_months',
  'lead_time_days',
  'shipment_notes',
  'hsn_code',
  'currency',
  'ex_factory_per_unit',
  'fob_per_unit',
  'cif_per_unit',
  'ddp_per_unit',
  'distributor_per_unit',
  'retail_per_unit',
  'bulk_price_per_kg',
  'price_effective_from',
  'price_effective_to',
  'row_action',
  'notes',
] as const;

export const CATEGORY_IMPORT_HEADERS = [
  'category_name',
  'parent_category',
  'category_code',
  'description',
  'sort_order',
  'active_status',
  'default_country_of_origin',
  'default_shelf_life_months',
  'default_lead_time_days',
  'default_shipment_notes',
] as const;

export const LEAD_IMPORT_HEADERS = ['company_name','contact_name','email','phone','country','source','lead_status','interested_products','notes','assigned_to'] as const;

export const IMPORT_HEADERS: Record<ImportEntity, readonly string[]> = { products: PRODUCT_IMPORT_HEADERS, categories: CATEGORY_IMPORT_HEADERS, leads: LEAD_IMPORT_HEADERS };

export function csvEscape(value: unknown) {
  const text = String(value ?? '');
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function buildCsvTemplate(entity: ImportEntity) {
  const headers = IMPORT_HEADERS[entity];
  const sample = entity === 'products'
    ? [
        'Organic Moringa Leaf Powder',
        'RH-PW-010',
        'Roohted',
        'Powders',
        'Leaf Powders',
        'kg',
        'active',
        'quoteable',
        'Commercial moringa leaf powder for export buyers',
        '1 kg pouch',
        'RH-PW-010-1KG',
        '1 kg',
        '1000',
        'g',
        '10',
        '1',
        '',
        '10',
        'kg',
        'true',
        'India',
        '18',
        '21',
        'Store cool and dry; confirm documents before dispatch',
        '121190',
        'USD',
        '9.50',
        '11.75',
        '',
        '',
        '',
        '',
        '9.50',
        '',
        '',
        'upsert',
        'Use categories import before products import',
      ]
    : entity === 'categories'
      ? ['Fruit Powders','Powders','FRUIT_POWDERS','Spray dried and dehydrated fruit powders','10','active','India','18','21','Store cool and dry']
      : ['Acme Imports','Priya Shah','priya@example.com','+1 555 0100','United States','Trade Show','new','Mango Powder; Banana Chips','Interested in distributor pricing',''];
  return [headers.join(','), sample.map(csvEscape).join(',')].join('\n');
}

export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let quoted = false;
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];
    if (quoted) {
      if (char === '"' && next === '"') { cell += '"'; index += 1; }
      else if (char === '"') quoted = false;
      else cell += char;
    } else if (char === '"') quoted = true;
    else if (char === ',') { row.push(cell.trim()); cell = ''; }
    else if (char === '\n') { row.push(cell.trim()); rows.push(row); row = []; cell = ''; }
    else if (char !== '\r') cell += char;
  }
  if (cell.length || row.length) { row.push(cell.trim()); rows.push(row); }
  return rows.filter((entry) => entry.some((cellValue) => cellValue.trim()));
}

export type CsvValidationIssue = { row: number; field: string; severity: 'error' | 'warning'; message: string };
export type CsvValidationResult = { headers: string[]; rows: Record<string, string>[]; issues: CsvValidationIssue[] };

function requiredFields(entity: ImportEntity) {
  if (entity === 'products') return ['product_name', 'sku_code', 'category', 'pricing_type', 'pack_label', 'units_per_case', 'pricing_mode_default'];
  if (entity === 'categories') return ['category_name'];
  return ['company_name'];
}

const numericFields = new Set([
  'pack_size','pack_size_value','units_per_case','net_weight_kg','moq_cases','moq_kg','shelf_life_months','lead_time_days','sort_order','default_shelf_life_months','default_lead_time_days',
  'exw_price','fob_price','cif_price','ddp_price','distributor_price','retail_price','ex_factory_per_unit','fob_per_unit','cif_per_unit','ddp_per_unit','distributor_per_unit','retail_per_unit','bulk_price_per_kg'
]);
const productStartPriceFields = ['exw_price','fob_price','cif_price','ddp_price','distributor_price','retail_price','ex_factory_per_unit','fob_per_unit','bulk_price_per_kg'];

export function validateCsvImport(entity: ImportEntity, text: string): CsvValidationResult {
  const parsed = parseCsv(text);
  const expectedHeaders = IMPORT_HEADERS[entity];
  const headers = (parsed[0] ?? []).map((header) => header.trim().toLowerCase());
  const issues: CsvValidationIssue[] = [];
  for (const header of expectedHeaders.filter((header) => !headers.includes(header))) issues.push({ row: 1, field: header, severity: 'error', message: `Missing required header: ${header}` });
  const duplicateKeys = new Set<string>();
  const rows = parsed.slice(1).map((cells, rowIndex) => {
    const record: Record<string, string> = {};
    headers.forEach((header, cellIndex) => { record[header] = cells[cellIndex] ?? ''; });
    for (const field of requiredFields(entity)) if (!record[field]?.trim()) issues.push({ row: rowIndex + 2, field, severity: 'error', message: `${field} is required.` });
    if (entity === 'products' && !productStartPriceFields.some((field) => record[field]?.trim())) issues.push({ row: rowIndex + 2, field: 'ex_factory_per_unit', severity: 'warning', message: 'Provide at least one starting price when importing product pricing.' });
    const duplicateKey = entity === 'products' ? record.sku_code || record.sku : entity === 'categories' ? `${record.parent_category}/${record.category_name}` : record.email || record.company_name;
    if (duplicateKey?.trim()) {
      const normalized = duplicateKey.trim().toLowerCase();
      if (duplicateKeys.has(normalized)) issues.push({ row: rowIndex + 2, field: entity === 'products' ? 'sku_code' : 'company_name', severity: 'warning', message: 'Possible duplicate row in this file.' });
      duplicateKeys.add(normalized);
    }
    for (const [field, value] of Object.entries(record)) if (numericFields.has(field) && value.trim() && Number.isNaN(Number(value))) issues.push({ row: rowIndex + 2, field, severity: 'error', message: `${field} must be numeric.` });
    return record;
  });
  return { headers, rows, issues };
}

export function buildCsvFromRecords(headers: readonly string[], records: Record<string, unknown>[]) {
  return [headers.join(','), ...records.map((record) => headers.map((header) => csvEscape(record[header])).join(','))].join('\n');
}
