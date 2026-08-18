import type { MatrixRow } from './types';

export type MatrixRateField =
  | 'q1_rate_per_frame'
  | 'q2_rate_per_frame'
  | 'q3_rate_per_frame'
  | 'q4_rate_per_frame'
  | 'q5_rate_per_frame';

export type MatrixEditableField = MatrixRateField | 'construction_key' | 'client_product_id';

type SourceFormulaMetadata = {
  source_formulas?: Partial<Record<MatrixRateField, string>>;
  editable_fields?: string[];
  calculated_fields?: string[];
  source_cells?: Partial<Record<MatrixRateField, string>>;
};

type FormulaRow = MatrixRow & { metadata?: SourceFormulaMetadata & Record<string, unknown> };

const RATE_FIELDS: MatrixRateField[] = [
  'q1_rate_per_frame',
  'q2_rate_per_frame',
  'q3_rate_per_frame',
  'q4_rate_per_frame',
  'q5_rate_per_frame',
];

const COLUMN_TO_RATE_FIELD: Record<string, MatrixRateField> = {
  C: 'q1_rate_per_frame',
  D: 'q2_rate_per_frame',
  E: 'q3_rate_per_frame',
  F: 'q4_rate_per_frame',
  G: 'q5_rate_per_frame',
};

function metadataFor(row: FormulaRow): SourceFormulaMetadata {
  return (row.metadata ?? {}) as SourceFormulaMetadata;
}

export function matrixEditableFields(row: FormulaRow): MatrixEditableField[] {
  const configured = metadataFor(row).editable_fields ?? [];
  return configured.filter((field): field is MatrixEditableField =>
    field === 'construction_key' || field === 'client_product_id' || RATE_FIELDS.includes(field as MatrixRateField),
  );
}

export function matrixEditableRateFields(row: FormulaRow): MatrixRateField[] {
  return matrixEditableFields(row).filter((field): field is MatrixRateField => RATE_FIELDS.includes(field as MatrixRateField));
}

export function matrixCalculatedRateFields(row: FormulaRow): MatrixRateField[] {
  const formulas = metadataFor(row).source_formulas ?? {};
  return RATE_FIELDS.filter((field) => typeof formulas[field] === 'string' && Boolean(formulas[field]?.trim()));
}

function roundWorkbookNumber(value: number) {
  // Workbook source values are commercial rates. Trim floating point residue while
  // retaining more precision than the source workbook currently uses.
  return Math.round((value + Number.EPSILON) * 1_000_000_000) / 1_000_000_000;
}

class WorkbookFormulaParser {
  private cursor = 0;

  constructor(
    private readonly expression: string,
    private readonly currentSheet: string,
    private readonly resolveReference: (sheet: string, column: string, rowNumber: number) => number,
  ) {}

  parse() {
    const value = this.parseExpression();
    this.skipWhitespace();
    if (this.cursor !== this.expression.length) {
      throw new Error(`Unsupported workbook formula token near "${this.expression.slice(this.cursor)}".`);
    }
    if (!Number.isFinite(value)) throw new Error('Workbook formula produced a non-finite value.');
    return roundWorkbookNumber(value);
  }

  private parseExpression(): number {
    let value = this.parseTerm();
    while (true) {
      this.skipWhitespace();
      if (this.consume('+')) value += this.parseTerm();
      else if (this.consume('-')) value -= this.parseTerm();
      else return value;
    }
  }

  private parseTerm(): number {
    let value = this.parseFactor();
    while (true) {
      this.skipWhitespace();
      if (this.consume('*')) value *= this.parseFactor();
      else if (this.consume('/')) {
        const divisor = this.parseFactor();
        if (divisor === 0) throw new Error('Workbook formula attempted division by zero.');
        value /= divisor;
      } else return value;
    }
  }

  private parseFactor(): number {
    this.skipWhitespace();
    if (this.consume('+')) return this.parseFactor();
    if (this.consume('-')) return -this.parseFactor();
    if (this.consume('(')) {
      const value = this.parseExpression();
      this.skipWhitespace();
      if (!this.consume(')')) throw new Error('Workbook formula has an unmatched parenthesis.');
      return value;
    }

    const reference = this.readReference();
    if (reference) return this.resolveReference(reference.sheet, reference.column, reference.rowNumber);

    const number = this.readNumber();
    if (number != null) return number;
    throw new Error(`Unsupported workbook formula near "${this.expression.slice(this.cursor)}".`);
  }

  private readReference(): { sheet: string; column: string; rowNumber: number } | null {
    const remaining = this.expression.slice(this.cursor);
    const qualified = remaining.match(/^'((?:[^']|'')+)'!([A-Za-z]+)(\d+)/);
    if (qualified) {
      this.cursor += qualified[0].length;
      return {
        sheet: qualified[1].replace(/''/g, "'"),
        column: qualified[2].toUpperCase(),
        rowNumber: Number(qualified[3]),
      };
    }

    const plain = remaining.match(/^([A-Za-z]+)(\d+)/);
    if (!plain) return null;
    this.cursor += plain[0].length;
    return { sheet: this.currentSheet, column: plain[1].toUpperCase(), rowNumber: Number(plain[2]) };
  }

  private readNumber(): number | null {
    const remaining = this.expression.slice(this.cursor);
    const match = remaining.match(/^(?:\d+(?:\.\d*)?|\.\d+)/);
    if (!match) return null;
    this.cursor += match[0].length;
    return Number(match[0]);
  }

  private skipWhitespace() {
    while (/\s/.test(this.expression[this.cursor] ?? '')) this.cursor += 1;
  }

  private consume(token: string) {
    if (this.expression[this.cursor] !== token) return false;
    this.cursor += 1;
    return true;
  }
}

/**
 * Recalculate the cached Q1-Q5 values using only formulas preserved from the
 * authoritative workbook. Hard-coded workbook cells remain inputs; formula cells
 * are derived. This intentionally supports only the arithmetic/reference syntax
 * observed in the Stark workbook and fails closed on anything else.
 */
export function recalculateMatrixSourceRows<T extends FormulaRow>(rows: T[]): T[] {
  const bySourceCellRow = new Map<string, T>();
  const cloned = rows.map((row) => ({ ...row, metadata: row.metadata ? { ...row.metadata } : row.metadata })) as T[];

  for (const row of cloned) {
    if (!row.source_worksheet || !row.source_row_number) continue;
    bySourceCellRow.set(`${row.source_worksheet}::${row.source_row_number}`, row);
  }

  const cache = new Map<string, number>();
  const visiting = new Set<string>();

  const resolveRate = (sheet: string, column: string, rowNumber: number): number => {
    const field = COLUMN_TO_RATE_FIELD[column];
    if (!field) throw new Error(`Workbook formula references unsupported column ${column}. Only Q1-Q5 source columns C-G are allowed.`);
    const row = bySourceCellRow.get(`${sheet}::${rowNumber}`);
    if (!row) throw new Error(`Workbook formula references missing source row ${sheet}!${column}${rowNumber}.`);
    const key = `${sheet}!${column}${rowNumber}`;
    const cached = cache.get(key);
    if (cached != null) return cached;
    if (visiting.has(key)) throw new Error(`Circular workbook formula reference detected at ${key}.`);

    visiting.add(key);
    const formula = metadataFor(row).source_formulas?.[field];
    let value: number;
    if (formula) {
      const expression = formula.trim().replace(/^=/, '');
      value = new WorkbookFormulaParser(expression, sheet, resolveRate).parse();
      row[field] = value;
    } else {
      const sourceValue = row[field];
      if (sourceValue == null || !Number.isFinite(Number(sourceValue))) {
        throw new Error(`Workbook source cell ${key} requires a numeric editable value.`);
      }
      value = Number(sourceValue);
    }
    visiting.delete(key);
    cache.set(key, value);
    return value;
  };

  for (const row of cloned) {
    if (!row.source_worksheet || !row.source_row_number) continue;
    for (const field of matrixCalculatedRateFields(row)) {
      const column = RATE_FIELDS.indexOf(field) + 3;
      const columnLetter = String.fromCharCode(64 + column);
      resolveRate(row.source_worksheet, columnLetter, row.source_row_number);
    }
  }

  return cloned;
}
