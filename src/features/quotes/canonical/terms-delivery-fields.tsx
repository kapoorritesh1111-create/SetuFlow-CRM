'use client';

import { useState } from 'react';

/**
 * S27-STARK — Quote Terms delivery fields. The original Terms step assumed
 * every quote was an international export shipment (Incoterm, FX lock, Port
 * of Loading/Discharge) — wrong for a domestic packaging manufacturer like
 * Stark, where most orders are simply delivered within India. Domestic is
 * now the default view; International is an explicit opt-in for the rare
 * export order, and keeps the original fields so nothing is lost for orgs
 * that do need them.
 */

const inputCls = 'rounded-xl border border-slate-200 px-3 py-2 text-sm font-bold normal-case tracking-normal text-slate-700';
const labelCls = 'grid gap-2 text-xs font-black uppercase tracking-[0.12em] text-slate-400';

export default function TermsDeliveryFields({
  defaultCurrency,
  defaultLeadTime,
}: {
  defaultCurrency: string;
  defaultLeadTime: string;
}) {
  const [deliveryType, setDeliveryType] = useState<'domestic' | 'international'>('domestic');

  return (
    <>
      <div className="md:col-span-2">
        <p className={labelCls}>Delivery type</p>
        <div className="mt-2 flex gap-2">
          <button
            type="button"
            onClick={() => setDeliveryType('domestic')}
            className={`rounded-xl border px-4 py-2 text-sm font-bold ${deliveryType === 'domestic' ? 'border-blue-400 bg-blue-50 text-blue-700' : 'border-slate-200 text-slate-600'}`}
          >
            Domestic (India)
          </button>
          <button
            type="button"
            onClick={() => setDeliveryType('international')}
            className={`rounded-xl border px-4 py-2 text-sm font-bold ${deliveryType === 'international' ? 'border-blue-400 bg-blue-50 text-blue-700' : 'border-slate-200 text-slate-600'}`}
          >
            International / Export
          </button>
        </div>
        <input type="hidden" name="delivery_type" value={deliveryType} />
      </div>

      <label className={labelCls}>
        Currency
        <input name="currency" defaultValue={deliveryType === 'domestic' ? 'INR' : defaultCurrency} className={inputCls} key={`currency-${deliveryType}`} />
      </label>

      {deliveryType === 'domestic' ? (
        <>
          <label className={labelCls}>Delivery location<input name="delivery_city" placeholder="e.g. Delhi NCR, factory pickup" className={inputCls} /></label>
          <label className={labelCls}>
            Dispatch mode
            <select name="dispatch_mode" defaultValue="road_transport" className={inputCls}>
              <option value="road_transport">Road transport</option>
              <option value="courier">Courier</option>
              <option value="self_pickup">Self pick-up</option>
              <option value="rail">Rail freight</option>
            </select>
          </label>
          <label className={labelCls}>Payment terms<input name="payment_terms" defaultValue="50% Advance, 50% Before Dispatch" className={inputCls} /></label>
          <label className={labelCls}>Lead time<input name="lead_time" defaultValue={defaultLeadTime} className={inputCls} /></label>
          <label className={labelCls}>Tax note<input name="gst_note" defaultValue="GST extra as applicable" className={inputCls} /></label>
          <label className={labelCls}>Validity (days)<input name="validity_days" defaultValue="30" className={inputCls} /></label>
        </>
      ) : (
        <>
          <label className={labelCls}>
            Incoterm
            <select name="incoterm" defaultValue="FOB" className={inputCls}>
              <option value="FOB">FOB</option>
              <option value="ex_factory">EXW / Ex-Factory</option>
              <option value="CIF">CIF</option>
              <option value="CNF">CNF</option>
              <option value="DAP">DAP</option>
            </select>
          </label>
          <label className={labelCls}>
            FX Lock
            <select name="fx_rate" defaultValue="weekly_7" className={inputCls}>
              <option value="weekly_7">Weekly average · 7 days</option>
              <option value="daily_spot">Daily spot</option>
              <option value="manual_lock">Manual locked rate</option>
              <option value="not_required">Not required</option>
            </select>
          </label>
          <label className={labelCls}>Port of loading<input name="port_loading" defaultValue="Nhava Sheva (JNPT), India" className={inputCls} /></label>
          <label className={labelCls}>Port of discharge<input name="port_discharge" placeholder="e.g. Hamburg, Germany" className={inputCls} /></label>
          <label className={labelCls}>Payment terms<input name="payment_terms" defaultValue="30% Advance, 70% Against B/L Copy" className={inputCls} /></label>
          <label className={labelCls}>Lead time<input name="lead_time" defaultValue={defaultLeadTime} className={inputCls} /></label>
          <label className={labelCls}>Validity (days)<input name="validity_days" defaultValue="30" className={inputCls} /></label>
        </>
      )}
    </>
  );
}
