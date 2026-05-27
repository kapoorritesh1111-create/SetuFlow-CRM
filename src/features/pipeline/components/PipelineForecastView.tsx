import type { Lead, Stage } from '@/features/pipeline/types/board';

type StageGroup = {
  name: string;
  stages: Stage[];
  sort_order: number;
  ref: Stage;
};

type ForecastLead = Pick<Lead, 'id' | 'company_name' | 'deal_value' | 'deal_currency' | 'updated_at' | 'next_follow_up_at' | 'stage_id'>;

type PipelineForecastViewProps = {
  leads: ForecastLead[];
  stageGroups: StageGroup[];
  valueCurrency: string;
  buildLeadHref: (leadId: string) => string;
};

const monthFormatter = new Intl.DateTimeFormat('en-US', { month: 'short', year: 'numeric' });

const getForecastMonth = (lead: ForecastLead) => {
  const source = lead.next_follow_up_at ?? lead.updated_at ?? new Date().toISOString();
  const date = new Date(source);
  if (Number.isNaN(date.getTime())) return 'Unscheduled';
  return monthFormatter.format(date);
};

const formatMoney = (value: number, currency: string) => `${currency} ${Math.round(value).toLocaleString()}`;

export function PipelineForecastView({ leads, stageGroups, valueCurrency, buildLeadHref }: PipelineForecastViewProps) {
  const stageNameByStageId = new Map<string, string>();
  for (const group of stageGroups) {
    for (const stage of group.stages) stageNameByStageId.set(stage.id, group.name);
  }

  const rows = Array.from(
    leads.reduce((map, lead) => {
      const month = getForecastMonth(lead);
      const current = map.get(month) ?? { month, leads: [] as ForecastLead[] };
      current.leads.push(lead);
      map.set(month, current);
      return map;
    }, new Map<string, { month: string; leads: ForecastLead[] }>()),
  ).map(([, row]) => row);

  rows.sort((left, right) => {
    if (left.month === 'Unscheduled') return 1;
    if (right.month === 'Unscheduled') return -1;
    return new Date(left.month).getTime() - new Date(right.month).getTime();
  });

  return (
    <div style={{ margin: '12px 24px 24px', border: '1px solid #e2e8f0', borderRadius: '22px', background: 'white', boxShadow: '0 1px 3px rgba(15,23,42,.06)', overflow: 'hidden' }}>
      <div style={{ padding: '16px 18px', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
        <div>
          <div style={{ fontSize: '9px', fontWeight: 800, letterSpacing: '.16em', textTransform: 'uppercase', color: '#94a3b8' }}>Forecast view</div>
          <div style={{ fontSize: '18px', fontWeight: 800, color: '#0f172a' }}>{rows.length} forecast month{rows.length === 1 ? '' : 's'}</div>
        </div>
        <div style={{ fontSize: '13px', fontWeight: 800, color: '#0f172a' }}>{formatMoney(leads.reduce((sum, lead) => sum + (Number(lead.deal_value ?? 0) || 0), 0), valueCurrency)}</div>
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', minWidth: '760px', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#f8fafc' }}>
              <th style={{ textAlign: 'left', padding: '11px 14px', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '.12em', color: '#64748b' }}>Month</th>
              <th style={{ textAlign: 'right', padding: '11px 14px', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '.12em', color: '#64748b' }}>Value</th>
              <th style={{ textAlign: 'left', padding: '11px 14px', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '.12em', color: '#64748b' }}>Stage breakdown</th>
              <th style={{ textAlign: 'left', padding: '11px 14px', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '.12em', color: '#64748b' }}>Top leads</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const rowValue = row.leads.reduce((sum, lead) => sum + (Number(lead.deal_value ?? 0) || 0), 0);
              const stageBreakdown = stageGroups
                .map((group) => ({
                  name: group.name,
                  count: row.leads.filter((lead) => lead.stage_id && stageNameByStageId.get(lead.stage_id) === group.name).length,
                }))
                .filter((item) => item.count > 0);
              const topLeads = [...row.leads]
                .sort((left, right) => (Number(right.deal_value ?? 0) || 0) - (Number(left.deal_value ?? 0) || 0))
                .slice(0, 3);
              return (
                <tr key={row.month} style={{ borderTop: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '13px 14px', fontSize: '13px', fontWeight: 800, color: '#0f172a' }}>{row.month}</td>
                  <td style={{ padding: '13px 14px', textAlign: 'right', fontSize: '13px', fontWeight: 800, color: '#0f172a' }}>{formatMoney(rowValue, valueCurrency)}</td>
                  <td style={{ padding: '13px 14px' }}>
                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                      {stageBreakdown.map((item) => (
                        <span key={item.name} style={{ display: 'inline-flex', border: '1px solid #e2e8f0', borderRadius: '999px', padding: '3px 8px', fontSize: '10px', fontWeight: 700, color: '#475569', background: '#f8fafc' }}>{item.name}: {item.count}</span>
                      ))}
                    </div>
                  </td>
                  <td style={{ padding: '13px 14px' }}>
                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                      {topLeads.map((lead) => (
                        <a key={lead.id} href={buildLeadHref(lead.id)} style={{ color: '#1d4ed8', fontSize: '11px', fontWeight: 700, textDecoration: 'none' }}>{lead.company_name}</a>
                      ))}
                    </div>
                  </td>
                </tr>
              );
            })}
            {!rows.length ? <tr><td colSpan={4} style={{ padding: '40px', textAlign: 'center', color: '#64748b', fontSize: '13px' }}>No forecastable leads match the current filters.</td></tr> : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
