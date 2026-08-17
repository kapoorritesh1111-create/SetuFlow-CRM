type LifecycleStep = {
  key: string;
  label: string;
  value: string | number;
  help: string;
};

export function EventLifecycleStrip({ captured, qualified, followUps, converted, pipelineLabel }: { captured: number; qualified: number; followUps: number; converted: number; pipelineLabel: string }) {
  const steps: LifecycleStep[] = [
    { key: 'plan', label: 'Plan', value: 'Ready', help: 'Booth, team and capture readiness' },
    { key: 'capture', label: 'Capture', value: captured, help: 'Booth conversations saved' },
    { key: 'qualify', label: 'Qualify', value: qualified, help: 'Requirements captured' },
    { key: 'follow-up', label: 'Follow-up', value: followUps, help: 'Open next actions' },
    { key: 'convert', label: 'Convert', value: converted, help: 'CRM conversions' },
    { key: 'roi', label: 'ROI', value: pipelineLabel, help: 'Attributed pipeline' },
  ];

  return (
    <section className="overflow-x-auto rounded-[28px] border border-slate-200 bg-white p-3 shadow-sm">
      <div className="grid min-w-[760px] grid-cols-6 divide-x divide-slate-100">
        {steps.map((step, index) => (
          <div key={step.key} className="px-3 py-2">
            <p className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">{index + 1}. {step.label}</p>
            <p className="mt-1 text-lg font-black text-slate-950">{step.value}</p>
            <p className="mt-1 text-[10px] font-semibold leading-4 text-slate-500">{step.help}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
