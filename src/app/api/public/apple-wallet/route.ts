import { NextRequest, NextResponse } from 'next/server';

function walletSetupPage(provider: string, name: string, cardUrl: string, note: string) {
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${provider} setup</title><style>body{margin:0;font-family:Inter,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;background:#f8fafc;color:#061c2e;display:grid;min-height:100vh;place-items:center;padding:24px}.card{max-width:520px;border:1px solid #dbe5ef;background:#fff;border-radius:28px;padding:28px;box-shadow:0 28px 80px rgba(15,23,42,.14)}.badge{display:inline-flex;border-radius:999px;background:#eaf5f3;color:#0f766e;padding:6px 12px;font-size:11px;font-weight:800;letter-spacing:.14em;text-transform:uppercase}h1{font-size:30px;line-height:1.05;margin:18px 0 10px}p{color:#475569;line-height:1.7}.actions{display:flex;gap:10px;flex-wrap:wrap;margin-top:20px}a{border-radius:14px;padding:12px 16px;text-decoration:none;font-weight:750}.primary{background:#0b2e4a;color:#fff}.secondary{background:#f1f5f9;color:#0b2e4a}</style></head><body><main class="card"><span class="badge">${provider}</span><h1>Wallet pass setup is ready for ${name}.</h1><p>${note}</p><p>This premium pass needs provider credentials before the wallet button can generate a signed pass. The public card and contact download continue to work now.</p><div class="actions"><a class="primary" href="${cardUrl}">Open card</a><a class="secondary" href="/contact-exchange/vcard">Back to My Card</a></div></main></body></html>`;
}

export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get('url') || '/card';
  const name = request.nextUrl.searchParams.get('name') || 'SETU Flow contact';
  const absoluteCardUrl = url.startsWith('http') ? url : `${request.nextUrl.origin}${url.startsWith('/') ? url : `/${url}`}`;

  return new NextResponse(
    walletSetupPage('Apple Wallet', name, absoluteCardUrl, 'Apple Wallet requires a signed .pkpass generated with Apple Wallet certificates.'),
    { status: 200, headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' } },
  );
}
