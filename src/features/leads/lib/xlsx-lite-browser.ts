type SheetRow = string[];

function u16(view: DataView, offset: number) { return view.getUint16(offset, true); }
function u32(view: DataView, offset: number) { return view.getUint32(offset, true); }

async function inflateRaw(bytes: Uint8Array) {
  if (typeof DecompressionStream === 'undefined') throw new Error('This browser cannot read compressed XLSX files. Use CSV instead.');
  const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

async function unzip(buffer: ArrayBuffer) {
  const bytes = new Uint8Array(buffer);
  const view = new DataView(buffer);
  let eocd = -1;
  for (let offset = bytes.length - 22; offset >= Math.max(0, bytes.length - 65557); offset -= 1) {
    if (u32(view, offset) === 0x06054b50) { eocd = offset; break; }
  }
  if (eocd < 0) throw new Error('Invalid XLSX file: ZIP directory not found.');
  const totalEntries = u16(view, eocd + 10);
  let cursor = u32(view, eocd + 16);
  const decoder = new TextDecoder();
  const entries = new Map<string, Uint8Array>();

  for (let index = 0; index < totalEntries; index += 1) {
    if (u32(view, cursor) !== 0x02014b50) throw new Error('Invalid XLSX file: ZIP entry is malformed.');
    const method = u16(view, cursor + 10);
    const compressedSize = u32(view, cursor + 20);
    const nameLength = u16(view, cursor + 28);
    const extraLength = u16(view, cursor + 30);
    const commentLength = u16(view, cursor + 32);
    const localOffset = u32(view, cursor + 42);
    const name = decoder.decode(bytes.slice(cursor + 46, cursor + 46 + nameLength));

    if (u32(view, localOffset) !== 0x04034b50) throw new Error('Invalid XLSX file: local ZIP entry is malformed.');
    const localNameLength = u16(view, localOffset + 26);
    const localExtraLength = u16(view, localOffset + 28);
    const dataStart = localOffset + 30 + localNameLength + localExtraLength;
    const compressed = bytes.slice(dataStart, dataStart + compressedSize);
    if (method === 0) entries.set(name, compressed);
    else if (method === 8) entries.set(name, await inflateRaw(compressed));
    else throw new Error(`Unsupported XLSX compression method ${method}.`);

    cursor += 46 + nameLength + extraLength + commentLength;
  }
  return entries;
}

function columnIndex(cellRef: string) {
  const letters = cellRef.replace(/[^A-Z]/gi, '').toUpperCase();
  let value = 0;
  for (const char of letters) value = value * 26 + (char.charCodeAt(0) - 64);
  return Math.max(0, value - 1);
}

function readSharedStrings(xml: string) {
  if (!xml) return [] as string[];
  const doc = new DOMParser().parseFromString(xml, 'application/xml');
  return Array.from(doc.getElementsByTagName('si')).map((item) =>
    Array.from(item.getElementsByTagName('t')).map((node) => node.textContent ?? '').join(''),
  );
}

function readWorksheet(xml: string, shared: string[]) {
  const doc = new DOMParser().parseFromString(xml, 'application/xml');
  const rows: SheetRow[] = [];
  for (const rowNode of Array.from(doc.getElementsByTagName('row'))) {
    const row: string[] = [];
    for (const cell of Array.from(rowNode.getElementsByTagName('c'))) {
      const ref = cell.getAttribute('r') ?? '';
      const type = cell.getAttribute('t') ?? '';
      const index = columnIndex(ref);
      let value = '';
      if (type === 'inlineStr') value = Array.from(cell.getElementsByTagName('t')).map((node) => node.textContent ?? '').join('');
      else {
        const raw = cell.getElementsByTagName('v')[0]?.textContent ?? '';
        value = type === 's' ? (shared[Number(raw)] ?? '') : raw;
      }
      row[index] = value;
    }
    rows.push(row.map((value) => String(value ?? '').trim()));
  }
  return rows;
}

export async function parseXlsxFirstSheet(file: File) {
  const entries = await unzip(await file.arrayBuffer());
  const decoder = new TextDecoder();
  const shared = readSharedStrings(entries.get('xl/sharedStrings.xml') ? decoder.decode(entries.get('xl/sharedStrings.xml')!) : '');
  const sheetEntry = entries.get('xl/worksheets/sheet1.xml');
  if (!sheetEntry) throw new Error('The XLSX file does not contain a first worksheet.');
  return readWorksheet(decoder.decode(sheetEntry), shared);
}
