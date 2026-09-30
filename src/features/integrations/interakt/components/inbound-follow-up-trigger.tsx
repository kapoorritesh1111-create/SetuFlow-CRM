'use client';
export function InboundFollowUpTrigger(){return <button type="button" onClick={()=>window.dispatchEvent(new Event('stark:open-follow-up'))} className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-bold text-amber-800">⏰ Follow-up</button>}
