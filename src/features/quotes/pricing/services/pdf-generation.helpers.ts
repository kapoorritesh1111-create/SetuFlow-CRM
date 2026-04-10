function stripHtmlToText(html: string): string[] {
  const withoutScripts = html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, ' ')
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, ' ');

  const withBreaks = withoutScripts
    .replace(/<(br|\/p|\/div|\/tr|\/li|\/h1|\/h2|\/h3|\/h4|\/h5|\/h6)>/gi, '\n')
    .replace(/<li>/gi, '• ')
    .replace(/<\/td>\s*<td[^>]*>/gi, ' | ')
    .replace(/<\/th>\s*<th[^>]*>/gi, ' | ');

  const withoutTags = withBreaks.replace(/<[^>]+>/g, ' ');
  const decoded = withoutTags
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'");

  return decoded
    .split(/\r?\n/)
    .map((line) => line.replace(/\s+/g, ' ').trim())
    .filter((line, index, lines) => line.length > 0 || lines[index - 1] !== '');
}

function normalizePdfText(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)')
    .replace(/[^\x20-\x7E]/g, '?');
}

function wrapLine(line: string, maxChars = 92): string[] {
  if (line.length <= maxChars) {
    return [line];
  }

  const words = line.split(' ');
  const wrapped: string[] = [];
  let current = '';

  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;

    if (candidate.length <= maxChars) {
      current = candidate;
      continue;
    }

    if (current) {
      wrapped.push(current);
      current = word;
      continue;
    }

    wrapped.push(word.slice(0, maxChars));
    current = word.slice(maxChars);
  }

  if (current) {
    wrapped.push(current);
  }

  return wrapped;
}

function buildPageTextContent(lines: string[]): string {
  const topY = 792 - 48;
  const lineHeight = 14;

  const contentLines = ['BT', '/F1 10 Tf', `${40} ${topY} Td`, `${lineHeight} TL`];

  lines.forEach((line, index) => {
    const escaped = normalizePdfText(line);
    if (index === 0) {
      contentLines.push(`(${escaped}) Tj`);
    } else {
      contentLines.push('T*');
      contentLines.push(`(${escaped}) Tj`);
    }
  });

  contentLines.push('ET');
  return contentLines.join('\n');
}

export function renderHtmlToPdfBuffer(html: string): Buffer {
  const textLines = stripHtmlToText(html).flatMap((line) => wrapLine(line));
  const safeLines = textLines.length > 0 ? textLines : ['Quote document'];
  const pageSize = 48;
  const pages: string[][] = [];

  for (let index = 0; index < safeLines.length; index += pageSize) {
    pages.push(safeLines.slice(index, index + pageSize));
  }

  const objects: string[] = [];
  const objectNumbers: { font: number; pages: number; pageIds: number[]; contentIds: number[] } = {
    font: 1,
    pages: 2,
    pageIds: [],
    contentIds: [],
  };

  let nextObjectId = 3;
  for (let index = 0; index < pages.length; index += 1) {
    objectNumbers.pageIds.push(nextObjectId);
    nextObjectId += 1;
    objectNumbers.contentIds.push(nextObjectId);
    nextObjectId += 1;
  }

  const catalogId = nextObjectId;

  objects[objectNumbers.font] = '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>';
  objects[objectNumbers.pages] = `<< /Type /Pages /Kids [${objectNumbers.pageIds.map((id) => `${id} 0 R`).join(' ')}] /Count ${pages.length} >>`;

  pages.forEach((pageLines, index) => {
    const content = buildPageTextContent(pageLines);
    const contentId = objectNumbers.contentIds[index]!;
    const pageId = objectNumbers.pageIds[index]!;

    objects[contentId] = `<< /Length ${Buffer.byteLength(content, 'utf8')} >>\nstream\n${content}\nendstream`;
    objects[pageId] = `<< /Type /Page /Parent ${objectNumbers.pages} 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 ${objectNumbers.font} 0 R >> >> /Contents ${contentId} 0 R >>`;
  });

  objects[catalogId] = `<< /Type /Catalog /Pages ${objectNumbers.pages} 0 R >>`;

  let pdf = '%PDF-1.4\n';
  const offsets: number[] = [0];

  for (let objectId = 1; objectId <= catalogId; objectId += 1) {
    offsets[objectId] = Buffer.byteLength(pdf, 'utf8');
    pdf += `${objectId} 0 obj\n${objects[objectId]}\nendobj\n`;
  }

  const xrefOffset = Buffer.byteLength(pdf, 'utf8');
  pdf += `xref\n0 ${catalogId + 1}\n`;
  pdf += '0000000000 65535 f \n';

  for (let objectId = 1; objectId <= catalogId; objectId += 1) {
    pdf += `${String(offsets[objectId]).padStart(10, '0')} 00000 n \n`;
  }

  pdf += `trailer\n<< /Size ${catalogId + 1} /Root ${catalogId} 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
  return Buffer.from(pdf, 'utf8');
}
