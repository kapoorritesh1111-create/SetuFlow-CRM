import { NextResponse } from 'next/server';
import { requireWorkspace } from '@/lib/workspace/auth';

const STARK_ORG_ID = 'b97913cb-3b95-4247-8ced-ffdc0d392d2a';
const encoder = new TextEncoder();

function crc32(bytes: Uint8Array) {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function le16(value: number) { return [value & 255, (value >>> 8) & 255]; }
function le32(value: number) { return [value & 255, (value >>> 8) & 255, (value >>> 16) & 255, (value >>> 24) & 255]; }
function concat(parts: Uint8Array[]) {
  const total = parts.reduce((sum, part) => sum + part.length, 0);
  const out = new Uint8Array(total);
  let offset = 0;
  for (const part of parts) { out.set(part, offset); offset += part.length; }
  return out;
}
function bytes(values: number[]) { return new Uint8Array(values); }

function zipStored(files: Array<{ name: string; content: string }>) {
  const localParts: Uint8Array[] = [];
  const centralParts: Uint8Array[] = [];
  let offset = 0;
  for (const file of files) {
    const name = encoder.encode(file.name);
    const data = encoder.encode(file.content);
    const crc = crc32(data);
    const local = concat([
      bytes([...le32(0x04034b50), ...le16(20), ...le16(0), ...le16(0), ...le16(0), ...le16(0), ...le32(crc), ...le32(data.length), ...le32(data.length), ...le16(name.length), ...le16(0)]),
      name,
      data,
    ]);
    localParts.push(local);
    const central = concat([
      bytes([...le32(0x02014b50), ...le16(20), ...le16(20), ...le16(0), ...le16(0), ...le16(0), ...le16(0), ...le32(crc), ...le32(data.length), ...le32(data.length), ...le16(name.length), ...le16(0), ...le16(0), ...le16(0), ...le16(0), ...le32(0), ...le32(offset)]),
      name,
    ]);
    centralParts.push(central);
    offset += local.length;
  }
  const central = concat(centralParts);
  const end = bytes([...le32(0x06054b50), ...le16(0), ...le16(0), ...le16(files.length), ...le16(files.length), ...le32(central.length), ...le32(offset), ...le16(0)]);
  return concat([...localParts, central, end]);
}

function xmlEscape(value: string) {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
}
function columnName(index: number) {
  let value = index + 1;
  let result = '';
  while (value > 0) { value -= 1; result = String.fromCharCode(65 + (value % 26)) + result; value = Math.floor(value / 26); }
  return result;
}
function sheetXml(rows: string[][]) {
  const body = rows.map((row, rowIndex) => `<row r="${rowIndex + 1}">${row.map((value, colIndex) => `<c r="${columnName(colIndex)}${rowIndex + 1}" t="inlineStr"><is><t>${xmlEscape(value)}</t></is></c>`).join('')}</row>`).join('');
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>${body}</sheetData></worksheet>`;
}

function createWorkbook() {
  const headers = ['Contact Name', 'Company', 'Mobile', 'Email', 'City', 'Requirement', 'Notes', 'Assigned To', 'Source'];
  const instructions = [
    ['Setu Flow Lead Import Instructions', ''],
    ['Contact Name', 'Required. Person or primary contact name.'],
    ['Company', 'Recommended. If blank, Setu Flow temporarily uses Contact Name as the company display.'],
    ['Mobile', 'Required. Include country code when possible.'],
    ['Email', 'Optional. Must be a valid email when supplied.'],
    ['City', 'Optional. Stored as import metadata for reporting/enrichment.'],
    ['Requirement', 'Optional. Product, packaging type or requested requirement.'],
    ['Notes', 'Optional. Free-text context for the salesperson.'],
    ['Assigned To', 'Optional. Use the exact active Stark user name or email. Owner/Manager can also assign all during preview.'],
    ['Source', 'Optional. Examples: Field Sales Import, Existing Prospect List, Trade List, Manual Import.'],
    ['Duplicate behavior', 'Rows matching an existing or same-file Mobile or Email are flagged and not silently imported.'],
    ['Field Sales ownership', 'Field Sales users can import only into their own ownership. Owner/Manager/Admin can explicitly assign.'],
  ];
  return zipStored([
    { name: '[Content_Types].xml', content: '<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/worksheets/sheet2.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/></Types>' },
    { name: '_rels/.rels', content: '<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>' },
    { name: 'xl/workbook.xml', content: '<?xml version="1.0" encoding="UTF-8"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Leads" sheetId="1" r:id="rId1"/><sheet name="Instructions" sheetId="2" r:id="rId2"/></sheets></workbook>' },
    { name: 'xl/_rels/workbook.xml.rels', content: '<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet2.xml"/><Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>' },
    { name: 'xl/styles.xml', content: '<?xml version="1.0" encoding="UTF-8"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><fonts count="1"><font><sz val="11"/><name val="Aptos"/></font></fonts><fills count="1"><fill><patternFill patternType="none"/></fill></fills><borders count="1"><border/></borders><cellStyleXfs count="1"><xf/></cellStyleXfs><cellXfs count="1"><xf xfId="0"/></cellXfs></styleSheet>' },
    { name: 'xl/worksheets/sheet1.xml', content: sheetXml([headers]) },
    { name: 'xl/worksheets/sheet2.xml', content: sheetXml(instructions) },
  ]);
}

export async function GET() {
  const workspace = await requireWorkspace();
  if (!workspace.organization || !workspace.membership || workspace.organization.id !== STARK_ORG_ID) return new NextResponse('Not authorized.', { status: 403 });
  const workbook = createWorkbook();
  return new NextResponse(workbook, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': 'attachment; filename="Setu-Flow-Lead-Import-Template.xlsx"',
      'Cache-Control': 'private, no-store',
    },
  });
}
