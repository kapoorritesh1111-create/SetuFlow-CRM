import { ImageResponse } from 'next/og';

export const runtime = 'edge';

export async function GET(request: Request) {
  const sizeValue = new URL(request.url).searchParams.get('size');
  const size = sizeValue === '180' ? 180 : sizeValue === '192' ? 192 : 512;
  return new ImageResponse(
    <div style={{ width: '100%', height: '100%', borderRadius: size * 0.21, background: 'linear-gradient(135deg, #07385f 0%, #020e25 100%)', display: 'flex', position: 'relative', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
      <svg width="78%" height="78%" viewBox="0 0 400 400" xmlns="http://www.w3.org/2000/svg">
        <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop stopColor="#55e6ef"/><stop offset="1" stopColor="#1466ed"/></linearGradient></defs>
        <path d="M64 252A147 147 0 0 1 336 252" fill="none" stroke="url(#g)" strokeWidth="28" strokeLinecap="round"/>
        <path d="M53 326 200 171v90l-67 65Z" fill="#1d83ff"/><path d="M347 326 200 171v90l67 65Z" fill="#26bdeb"/>
        <path d="m200 98 12 50 50 12-50 12-12 50-12-50-50-12 50-12Z" fill="#eaffff"/>
      </svg>
    </div>,
    { width: size, height: size, headers: { 'Cache-Control': 'public, max-age=3600' } },
  );
}
