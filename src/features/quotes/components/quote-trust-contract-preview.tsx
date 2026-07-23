import { type QuoteTrustContract } from "@/lib/quoteTrust";

type TrustTone = "neutral" | "warning" | "success";

function getTrustToneClasses(tone: TrustTone) {
  if (tone === "success") {
    return "border-emerald-200 bg-emerald-50 text-emerald-800";
  }
  if (tone === "warning") {
    return "border-amber-200 bg-amber-50 text-amber-900";
  }
  return "border-slate-200 bg-slate-50 text-slate-700";
}

export function QuoteTrustContractPreview({
  contract,
  title = "Quote trust contract",
  description = "The first runtime trust slice is now live here: make approval gate, lock posture, and the audit map visible before stronger enforcement work starts.",
  auditTitle = "Audit-event map",
  auditDescription = "This view defines what the audit trail must capture without changing the approved quote-builder rules.",
}: {
  contract: QuoteTrustContract;
  title?: string;
  description?: string;
  auditTitle?: string;
  auditDescription?: string;
}) {
  return (
    <div className="grid gap-3 lg:grid-cols-[1.05fr_0.95fr]">
      <div className="rounded-card border border-slate-200 bg-white p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
              {title}
            </p>
            <p className="mt-1 text-sm text-slate-600">{description}</p>
          </div>
          <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${getTrustToneClasses(contract.stateTone)}`}>
            {contract.stateLabel}
          </span>
        </div>
        <div className="mt-4 grid gap-3 lg:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-600">
            <p className="font-semibold text-slate-900">Approval gate</p>
            <div className="mt-2 flex flex-wrap gap-2">
              <span className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${getTrustToneClasses(contract.approvalTone)}`}>
                {contract.approvalLabel}
              </span>
            </div>
            <p className="mt-2">{contract.approvalDetail}</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-600">
            <p className="font-semibold text-slate-900">Lock posture</p>
            <p className="mt-2">{contract.stateDetail}</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-600">
            <p className="font-semibold text-slate-900">Builder mode</p>
            <p className="mt-2 font-medium text-slate-900">{contract.editorModeLabel}</p>
            <p className="mt-2">{contract.editorModeDetail}</p>
          </div>
        </div>
      </div>
      <div className="rounded-card border border-slate-200 bg-slate-50 p-4">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">{auditTitle}</p>
        <p className="mt-1 text-sm text-slate-600">{auditDescription}</p>
        <div className="mt-4 space-y-2">
          {contract.auditMap.map((event) => (
            <div key={event.key} className="rounded-card border border-slate-200 bg-white p-3 text-sm text-slate-600">
              <p className="font-semibold text-slate-900">{event.label}</p>
              <p className="mt-1">{event.detail}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
