export type ImportEntity = 'products' | 'categories' | 'leads';

export const PRODUCT_IMPORT_HEADERS = [
  'product_name',
  'sku',
  'category',
  'subcategory',
  'description',
  'unit_of_measure',
  'pack_size',
  'pack_unit',
  'pricing_basis',
  'currency',
  'exw_price',
  'fob_price',
  'cif_price',
  'ddp_price',
  'distributor_price',
  'retail_price',
  'active_status',
] as const;
export const CATEGORY_IMPORT_HEADERS = ['category_name','parent_category','description','active_status'] as const;
export const LEAD_IMPORT_HEADERS = ['company_name','contact_name','email','phone','country','source','lead_status','interested_products','notes','assigned_to'] as const;

export const IMPORT_HEADERS: Record<ImportEntity, readonly string[]> = { products: PRODUCT_IMPORT_HEADERS, categories: CATEGORY_IMPORT_HEADERS, leads: LEAD_IMPORT_HEADERS };

export function csvEscape(value: unknown) {
  const text = String(value ?? '');
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function buildCsvTemplate(entity: ImportEntity) {
  const headers = IMPORT_HEADERS[entity];
  const sample = entity === 'products'
    ? ['Banana Chips','RH-CS-BC-100','Vacuum-Cooked Chips','','Vacuum-cooked banana chips','case','100','g','case','USD','108','110','115','126.70','149.51','186.88','active']
    : entity === 'categories'
      ? ['Fruit Powders','Powders','Spray dried and dehydrated fruit powders','active']
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
  if (entity === 'products') return ['product_name', 'sku', 'category', 'unit_of_measure', 'pack_size', 'pack_unit', 'pricing_basis'];
  if (entity === 'categories') return ['category_name'];
  return ['company_name'];
}

const numericFields = new Set(['pack_size','exw_price','fob_price','cif_price','ddp_price','distributor_price','retail_price']);
const productStartPriceFields = ['exw_price','fob_price','cif_price','ddp_price','distributor_price','retail_price'];

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
    if (entity === 'products' && !productStartPriceFields.some((field) => record[field]?.trim())) issues.push({ row: rowIndex + 2, field: 'exw_price', severity: 'warning', message: 'Provide at least one starting price when importing product pricing.' });
    const duplicateKey = entity === 'products' ? record.sku : entity === 'categories' ? `${record.parent_category}/${record.category_name}` : record.email || record.company_name;
    if (duplicateKey?.trim()) {
      const normalized = duplicateKey.trim().toLowerCase();
      if (duplicateKeys.has(normalized)) issues.push({ row: rowIndex + 2, field: entity === 'products' ? 'sku' : 'company_name', severity: 'warning', message: 'Possible duplicate row in this file.' });
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
