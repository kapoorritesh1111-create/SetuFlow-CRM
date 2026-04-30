import { NextResponse } from 'next/server';

export async function GET(_request: Request, { params }: { params: { quoteId: string } }) {
  return NextResponse.json({
    quoteId: params.quoteId,
    url: `/approval-send?quoteId=${params.quoteId}`,
    note: 'Share endpoint placeholder for signed/public quote PDF URL. wa.me delivery uses this stable route until PDF storage signing is enabled.',
  });
}
