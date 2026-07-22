import { deflateSync, inflateSync } from 'zlib';

const LOGO_BUCKET = 'org-logos';

export type PdfImage = {
  width: number;
  height: number;
  data: Buffer;
  filter: 'DCTDecode' | 'FlateDecode';
  smask?: Buffer;
};

function safeLogoPath(value?: string | null) {
  const path = String(value ?? '').trim();
  return Boolean(path) && !path.includes('..') && !/^https?:\/\//i.test(path) && !path.startsWith('/') ? path : '';
}

function jpegSize(buffer: Buffer) {
  if (buffer.length < 4 || buffer[0] !== 0xff || buffer[1] !== 0xd8) return null;
  let offset = 2;
  while (offset + 9 < buffer.length) {
    if (buffer[offset] !== 0xff) return null;
    const marker = buffer[offset + 1];
    if (marker === 0xd9 || marker === 0xda) break;
    const len = buffer.readUInt16BE(offset + 2);
    if ([0xc0, 0xc1, 0xc2, 0xc3].includes(marker)) {
      return { height: buffer.readUInt16BE(offset + 5), width: buffer.readUInt16BE(offset + 7) };
    }
    if (len < 2) return null;
    offset += 2 + len;
  }
  return null;
}

function unfilterPngRow(filter: number, row: Buffer, prev: Buffer, bpp: number) {
  const out = Buffer.alloc(row.length);
  for (let i = 0; i < row.length; i += 1) {
    const left = i >= bpp ? out[i - bpp] : 0;
    const up = prev[i] ?? 0;
    const upLeft = i >= bpp ? (prev[i - bpp] ?? 0) : 0;
    let predict = 0;
    if (filter === 1) predict = left;
    else if (filter === 2) predict = up;
    else if (filter === 3) predict = Math.floor((left + up) / 2);
    else if (filter === 4) {
      const p = left + up - upLeft;
      const pa = Math.abs(p - left);
      const pb = Math.abs(p - up);
      const pc = Math.abs(p - upLeft);
      predict = pa <= pb && pa <= pc ? left : pb <= pc ? up : upLeft;
    }
    out[i] = (row[i] + predict) & 255;
  }
  return out;
}

function pngImage(buffer: Buffer): PdfImage | null {
  if (buffer.subarray(0, 8).toString('hex') !== '89504e470d0a1a0a') return null;
  let offset = 8;
  let imageWidth = 0;
  let imageHeight = 0;
  let bitDepth = 0;
  let colorType = 0;
  const idats: Buffer[] = [];

  while (offset + 8 <= buffer.length) {
    const len = buffer.readUInt32BE(offset);
    const type = buffer.subarray(offset + 4, offset + 8).toString('ascii');
    const data = buffer.subarray(offset + 8, offset + 8 + len);
    offset += len + 12;
    if (type === 'IHDR') {
      imageWidth = data.readUInt32BE(0);
      imageHeight = data.readUInt32BE(4);
      bitDepth = data[8];
      colorType = data[9];
      if (data[12] !== 0) return null;
    }
    if (type === 'IDAT') idats.push(data);
    if (type === 'IEND') break;
  }

  if (!imageWidth || !imageHeight || bitDepth !== 8 || ![0, 2, 4, 6].includes(colorType)) return null;
  const channels = colorType === 0 ? 1 : colorType === 2 ? 3 : colorType === 4 ? 2 : 4;
  const raw = inflateSync(Buffer.concat(idats));
  const stride = imageWidth * channels;
  const imageRgb = Buffer.alloc(imageWidth * imageHeight * 3);
  const alpha = colorType === 4 || colorType === 6 ? Buffer.alloc(imageWidth * imageHeight) : null;
  let rawOffset = 0;
  let rgbOffset = 0;
  let alphaOffset = 0;
  let prev = Buffer.alloc(stride);

  for (let y = 0; y < imageHeight; y += 1) {
    const filter = raw[rawOffset];
    rawOffset += 1;
    const row = unfilterPngRow(filter, raw.subarray(rawOffset, rawOffset + stride), prev, channels);
    rawOffset += stride;
    prev = row;
    for (let x = 0; x < imageWidth; x += 1) {
      const p = x * channels;
      if (colorType === 0) {
        imageRgb[rgbOffset++] = row[p];
        imageRgb[rgbOffset++] = row[p];
        imageRgb[rgbOffset++] = row[p];
      } else if (colorType === 2) {
        imageRgb[rgbOffset++] = row[p];
        imageRgb[rgbOffset++] = row[p + 1];
        imageRgb[rgbOffset++] = row[p + 2];
      } else if (colorType === 4) {
        imageRgb[rgbOffset++] = row[p];
        imageRgb[rgbOffset++] = row[p];
        imageRgb[rgbOffset++] = row[p];
        if (alpha) alpha[alphaOffset++] = row[p + 1];
      } else {
        imageRgb[rgbOffset++] = row[p];
        imageRgb[rgbOffset++] = row[p + 1];
        imageRgb[rgbOffset++] = row[p + 2];
        if (alpha) alpha[alphaOffset++] = row[p + 3];
      }
    }
  }

  return {
    width: imageWidth,
    height: imageHeight,
    filter: 'FlateDecode',
    data: deflateSync(imageRgb),
    smask: alpha ? deflateSync(alpha) : undefined,
  };
}

export function parsePdfImage(buffer: Buffer, type?: string | null): PdfImage | null {
  const lower = String(type ?? '').toLowerCase();
  if (lower.includes('jpeg') || lower.includes('jpg') || buffer.subarray(0, 2).toString('hex') === 'ffd8') {
    const size = jpegSize(buffer);
    return size ? { ...size, data: buffer, filter: 'DCTDecode' } : null;
  }
  return pngImage(buffer);
}

export async function loadOrganizationLogo(db: any, organizationId: string, org?: any): Promise<PdfImage | null> {
  try {
    const { data: brandSettings } = await db
      .from('organization_brand_settings')
      .select('workspace_logo_storage_path')
      .eq('organization_id', organizationId)
      .maybeSingle();
    const path = safeLogoPath((brandSettings as any)?.workspace_logo_storage_path ?? org?.logo_storage_path);
    if (!path) return null;
    const { data, error } = await db.storage.from(LOGO_BUCKET).download(path);
    if (error || !data) return null;
    return parsePdfImage(Buffer.from(await data.arrayBuffer()), data.type);
  } catch {
    return null;
  }
}
