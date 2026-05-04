import { NextRequest, NextResponse } from 'next/server';
import QRCode from 'qrcode';

function normalizeQrPayload(value: string | null) {
  const payload = String(value ?? '').trim();
  if (!payload) return null;
  // Keep the QR payload bounded so a malformed query cannot make the API heavy.
  return payload.slice(0, 1200);
}

export async function GET(request: NextRequest) {
  const payload = normalizeQrPayload(request.nextUrl.searchParams.get('data'));
  if (!payload) {
    return new NextResponse('Missing QR payload', { status: 400 });
  }

  try {
    const svg = await QRCode.toString(payload, {
      type: 'svg',
      errorCorrectionLevel: 'M',
      margin: 1,
      width: 260,
      color: {
        dark: '#0B2E4A',
        light: '#FFFFFF',
      },
    });

    return new NextResponse(svg, {
      status: 200,
      headers: {
        'Content-Type': 'image/svg+xml; charset=utf-8',
        'Cache-Control': 'public, max-age=300, stale-while-revalidate=86400',
      },
    });
  } catch (error) {
    return new NextResponse('Unable to generate QR code', { status: 500 });
  }
}
