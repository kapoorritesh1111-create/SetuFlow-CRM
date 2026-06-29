type BrandColorControlsProps = {
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
};

function safeHex(value: string | null | undefined, fallback: string) {
  const text = String(value ?? '').trim().toUpperCase();
  return /^#[0-9A-F]{6}$/.test(text) ? text : fallback;
}

function ColorControl({ label, name, value, help }: { label: string; name: string; value: string; help: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
      <label className="block text-[10px] font-black uppercase tracking-[0.16em] text-slate-400" htmlFor={`brand-${name}`}>
        {label}
      </label>
      <div className="mt-2 flex items-center gap-3">
        <input
          id={`brand-${name}`}
          type="color"
          name={name}
          defaultValue={value}
          className="h-12 w-16 cursor-pointer rounded-xl border border-slate-200 bg-white p-1"
        />
        <span className="font-mono text-xs font-black text-slate-800">{value}</span>
      </div>
      <p className="mt-2 text-[11px] font-semibold leading-4 text-slate-500">{help}</p>
    </div>
  );
}

export function BrandColorControls({ primaryColor, secondaryColor, accentColor }: BrandColorControlsProps) {
  const primary = safeHex(primaryColor, '#0B2E4A');
  const secondary = safeHex(secondaryColor, '#061C2E');
  const accent = safeHex(accentColor, '#0C7FFF');

  return (
    <div className="md:col-span-2 rounded-3xl border border-blue-100 bg-blue-50/70 p-4">
      <p className="text-xs font-black uppercase tracking-[0.18em] text-blue-700">Brand colors</p>
      <h3 className="mt-1 text-base font-black text-slate-950">Workspace theme controls</h3>
      <p className="mt-1 text-xs font-bold leading-5 text-slate-600">
        Choose colors visually. SETU defaults stay available, but the saved values always re-render here after reset or update.
      </p>
      <div className="mt-4 grid gap-3 md:grid-cols-3">
        <ColorControl label="Primary color" name="primary_color" value={primary} help="Used for key brand areas and top actions." />
        <ColorControl label="Secondary color" name="secondary_color" value={secondary} help="Used for sidebar depth and dark gradients." />
        <ColorControl label="Accent color" name="accent_color" value={accent} help="Used for buttons, links, WhatsApp and PDF actions." />
      </div>
      <p className="mt-3 rounded-2xl border border-white/70 bg-white p-3 text-xs font-bold leading-5 text-blue-900">
        Setu Guru recommendation: keep the sidebar darker than the primary color and use the accent only for actions.
      </p>
    </div>
  );
}
