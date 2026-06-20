'use client';

import type { CSSProperties } from 'react';
import { computeProductReadiness, readinessLabel, type ProductReadinessInput, type ProductReadiness } from '@/lib/catalog-share/types';

const TONE: Record<ProductReadiness, { bg: string; fg: string; dot: string }> = {
  ready: { bg: '#ecfdf5', fg: '#059669', dot: '#10b981' },
  needs_data: { bg: '#fffbeb', fg: '#b45309', dot: '#f59e0b' },
  missing_price: { bg: '#fef2f2', fg: '#dc2626', dot: '#ef4444' },
  missing_image: { bg: '#fffbeb', fg: '#b45309', dot: '#f59e0b' },
};

/** Small inline badge — for product table rows. */
export function ReadinessBadge({ product, style }: { product: ProductReadinessInput; style?: CSSProperties }) {
  const { status, score } = computeProductReadiness(product);
  const t = TONE[status];
  return (
    <span
      title={`Catalog readiness: ${score}%`}
      style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: t.bg, color: t.fg, fontSize: 10.5, fontWeight: 700, padding: '2px 8px', borderRadius: 6, whiteSpace: 'nowrap', ...style }}
    >
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: t.dot }} />
      {readinessLabel(status)}
    </span>
  );
}

/** Detailed panel — for the product drawer. Lists missing fields with optional Fix shortcuts. */
export function ReadinessPanel({ product, onFix }: { product: ProductReadinessInput; onFix?: (field: string) => void }) {
  const { status, score, missing } = computeProductReadiness(product);
  const t = TONE[status];
  return (
    <div style={{ border: `1px solid ${t.bg === '#ecfdf5' ? '#bbf7d0' : status === 'missing_price' ? '#fecaca' : '#fde68a'}`, background: t.bg, borderRadius: 12, padding: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ width: 8, height: 8, borderRadius: '50%', background: t.dot }} />
        <strong style={{ fontSize: 13, color: t.fg }}>{readinessLabel(status)}</strong>
        <span style={{ marginLeft: 'auto', fontSize: 12, fontWeight: 700, color: t.fg, fontFamily: "'DM Mono',monospace" }}>{score}%</span>
      </div>
      {missing.length > 0 ? (
        <div style={{ marginTop: 8 }}>
          <div style={{ fontSize: 11, color: '#64748b', marginBottom: 6 }}>Missing before this product is buyer-ready:</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {missing.map((field) => (
              <button
                key={field}
                onClick={onFix ? () => onFix(field) : undefined}
                style={{ border: '1px solid #e2e8f0', background: '#fff', color: '#475569', borderRadius: 6, padding: '3px 9px', fontSize: 11, fontWeight: 600, cursor: onFix ? 'pointer' : 'default' }}
              >
                {onFix ? `Fix ${field}` : field}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div style={{ marginTop: 6, fontSize: 11.5, color: '#059669' }}>All export-ready fields present. Safe to share with buyers.</div>
      )}
    </div>
  );
}
