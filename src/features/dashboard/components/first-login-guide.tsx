/**
 * FirstLoginGuide
 *
 * Shown when a user logs into an organization that has no data yet.
 * Provides a clear, step-by-step onboarding path so new organizations
 * are never dropped into a blank workspace without guidance.
 *
 * Proof criteria:
 * - Detected by: zero leads, zero quotes, zero products
 * - Shown on: Dashboard, above the main content, only when all counts are 0
 * - Hides automatically once data exists
 */

import Link from 'next/link';
import { PRODUCT_ROUTES } from '@/lib/product-contract';

type Step = {
  num: number;
  title: string;
  description: string;
  href: string;
  cta: string;
  done: boolean;
};

export function FirstLoginGuide({
  hasLeads,
  hasProducts,
  hasQuotes,
  orgName,
}: {
  hasLeads: boolean;
  hasProducts: boolean;
  hasQuotes: boolean;
  orgName: string;
}) {
  // If the org has any meaningful data, don't show the guide
  if (hasLeads && hasProducts) return null;

  const steps: Step[] = [
    {
      num: 1,
      title: 'Add your product catalog',
      description: 'Upload your products and set Ex-Factory, FOB, and bulk pricing. The catalog is the commercial baseline — quotes start here.',
      href: PRODUCT_ROUTES.app.products,
      cta: 'Go to Catalog',
      done: hasProducts,
    },
    {
      num: 2,
      title: 'Create your first lead',
      description: 'Add a buyer or supplier lead and link it to your product catalog. Leads are the entry point for every quote and order.',
      href: PRODUCT_ROUTES.app.leads,
      cta: 'Create a Lead',
      done: hasLeads,
    },
    {
      num: 3,
      title: 'Build and send your first quote',
      description: 'Once a lead is qualified and linked to products, create a quote with pricing, freight, and approval governance built in.',
      href: PRODUCT_ROUTES.app.quotes,
      cta: 'Go to Quotes',
      done: hasQuotes,
    },
  ];

  const completedCount = steps.filter((step) => step.done).length;
  const progressPct = Math.round((completedCount / steps.length) * 100);

  return (
    <div
      style={{
        background: 'linear-gradient(135deg,#1b2a4a 0%,#0d7c8c 100%)',
        borderRadius: '16px',
        padding: '24px 28px',
        marginBottom: '20px',
        color: '#fff',
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '16px' }}>
        <div>
          <div style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '.18em', textTransform: 'uppercase', color: 'rgba(255,255,255,.6)', marginBottom: '4px' }}>
            Getting started
          </div>
          <div style={{ fontSize: '18px', fontWeight: 700, letterSpacing: '-.3px' }}>
            Welcome to {orgName}
          </div>
          <div style={{ fontSize: '13px', color: 'rgba(255,255,255,.75)', marginTop: '4px' }}>
            Complete these steps to set up your governed commercial workspace.
          </div>
        </div>
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <div style={{ fontSize: '26px', fontWeight: 800, letterSpacing: '-.5px' }}>{completedCount}/{steps.length}</div>
          <div style={{ fontSize: '10px', color: 'rgba(255,255,255,.6)' }}>steps done</div>
        </div>
      </div>

      {/* Progress bar */}
      <div style={{ height: '4px', background: 'rgba(255,255,255,.15)', borderRadius: '2px', marginBottom: '20px', overflow: 'hidden' }}>
        <div
          style={{
            height: '100%',
            width: `${progressPct}%`,
            background: 'linear-gradient(90deg,#27ae60,#2ecc71)',
            borderRadius: '2px',
            transition: 'width .4s ease',
          }}
        />
      </div>

      {/* Steps */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '12px' }}>
        {steps.map((step) => (
          <div
            key={step.num}
            style={{
              background: step.done ? 'rgba(39,174,96,.18)' : 'rgba(255,255,255,.09)',
              border: step.done ? '1px solid rgba(39,174,96,.4)' : '1px solid rgba(255,255,255,.12)',
              borderRadius: '12px',
              padding: '16px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <div
                style={{
                  width: '24px',
                  height: '24px',
                  borderRadius: '50%',
                  background: step.done ? '#27ae60' : 'rgba(255,255,255,.15)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '11px',
                  fontWeight: 800,
                  flexShrink: 0,
                }}
              >
                {step.done ? '✓' : step.num}
              </div>
              <div style={{ fontSize: '12px', fontWeight: 700, color: step.done ? 'rgba(255,255,255,.7)' : '#fff' }}>
                {step.title}
              </div>
            </div>
            <div style={{ fontSize: '11px', color: 'rgba(255,255,255,.65)', lineHeight: '1.5', marginBottom: '12px' }}>
              {step.description}
            </div>
            {!step.done && (
              <Link
                href={step.href}
                style={{
                  display: 'inline-block',
                  padding: '6px 14px',
                  borderRadius: '6px',
                  background: '#0d7c8c',
                  color: '#fff',
                  fontSize: '11px',
                  fontWeight: 700,
                  textDecoration: 'none',
                  border: '1px solid rgba(255,255,255,.2)',
                }}
              >
                {step.cta} →
              </Link>
            )}
            {step.done && (
              <span style={{ fontSize: '11px', color: '#27ae60', fontWeight: 700 }}>✓ Complete</span>
            )}
          </div>
        ))}
      </div>

      {/* Footer note */}
      <div style={{ marginTop: '14px', fontSize: '11px', color: 'rgba(255,255,255,.5)', textAlign: 'center' }}>
        This guide disappears automatically once your catalog and first lead are ready.
      </div>
    </div>
  );
}
