import type { Lead, Stage } from '@/features/pipeline/types/board';
import { getStageAccent } from '@/features/leads/command-center/ui-system';

type StageGroup = {
  name: string;
  stages: Stage[];
  sort_order: number;
  ref: Stage;
};

type SwimlaneLead = Pick<Lead, 'id' | 'company_name' | 'contact_name' | 'deal_value' | 'deal_currency' | 'lead_type' | 'owner_user_id' | 'stage_id' | 'pipeline_id'>;

type PipelineSwimlaneViewProps = {
  leads: SwimlaneLead[];
  stageGroups: StageGroup[];
  ownerLabelById: Map<string, string>;
  valueCurrency: string;
  buildLeadHref: (leadId: string) => string;
};

const formatMoney = (value: number, currency: string) => `${currency} ${Math.round(value).toLocaleString()}`;

export function PipelineSwimlaneView({ leads, stageGroups, ownerLabelById, valueCurrency, buildLeadHref }: PipelineSwimlaneViewProps) {
  const stageGroupByStageId = new Map<string, StageGroup>();
  for (const group of stageGroups) {
    for (const stage of group.stages) stageGroupByStageId.set(stage.id, group);
  }

  return (
    <div style={{ margin: '12px 24px 24px', overflowX: 'auto', border: '1px solid #e2e8f0', borderRadius: '22px', background: 'white', boxShadow: '0 1px 3px rgba(15,23,42,.06)' }}>
      <div style={{ minWidth: Math.max(760, 220 + stageGroups.length * 150) }}>
        <div style={{ display: 'grid', gridTemplateColumns: `220px repeat(${stageGroups.length}, minmax(150px, 1fr))`, borderBottom: '1px solid #e2e8f0', background: '#f8fafc', position: 'sticky', top: 0, zIndex: 1 }}>
          <div style={{ padding: '12px 14px', fontSize: '10px', fontWeight: 800, letterSpacing: '.16em', textTransform: 'uppercase', color: '#64748b' }}>Lead portfolio</div>
          {stageGroups.map((group) => (
            <div key={group.name} style={{ padding: '12px 10px', borderLeft: '1px solid #e2e8f0' }}>
              <div style={{ height: '3px', borderRadius: '999px', background: getStageAccent(group.name), marginBottom: '7px' }} />
              <div style={{ fontSize: '11px', fontWeight: 800, color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{group.name}</div>
            </div>
          ))}
        </div>

        {leads.map((lead) => {
          const activeGroup = lead.stage_id ? stageGroupByStageId.get(lead.stage_id) : null;
          const dealValue = Number(lead.deal_value ?? 0) || 0;
          return (
            <div key={lead.id} style={{ display: 'grid', gridTemplateColumns: `220px repeat(${stageGroups.length}, minmax(150px, 1fr))`, borderBottom: '1px solid #f1f5f9' }}>
              <a href={buildLeadHref(lead.id)} style={{ padding: '12px 14px', color: '#0f172a', textDecoration: 'none', borderRight: '1px solid #e2e8f0' }}>
                <div style={{ fontSize: '12px', fontWeight: 800, marginBottom: '3px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{lead.company_name}</div>
                <div style={{ fontSize: '10px', color: '#64748b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{lead.contact_name ?? 'No contact'} · {lead.owner_user_id ? ownerLabelById.get(lead.owner_user_id) ?? 'Unassigned' : 'Unassigned'}</div>
              </a>
              {stageGroups.map((group) => {
                const isActive = activeGroup?.name === group.name;
                return (
                  <div key={`${lead.id}-${group.name}`} style={{ minHeight: '64px', padding: '8px', borderLeft: '1px solid #f1f5f9', background: isActive ? '#f8fafc' : 'white' }}>
                    {isActive ? (
                      <a href={buildLeadHref(lead.id)} style={{ display: 'block', border: '1px solid #dbeafe', borderLeft: `3px solid ${getStageAccent(group.name)}`, borderRadius: '12px', padding: '8px', background: 'white', textDecoration: 'none', color: '#1e293b', boxShadow: '0 1px 2px rgba(15,23,42,.05)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '6px', alignItems: 'center' }}>
                          <span style={{ fontSize: '10px', fontWeight: 800 }}>{lead.lead_type}</span>
                          <span style={{ fontSize: '10px', fontWeight: 700, color: '#64748b' }}>{dealValue ? formatMoney(dealValue, lead.deal_currency ?? valueCurrency) : 'No value'}</span>
                        </div>
                      </a>
                    ) : null}
                  </div>
                );
              })}
            </div>
          );
        })}

        {!leads.length ? <div style={{ padding: '40px', textAlign: 'center', fontSize: '13px', color: '#64748b' }}>No leads match the current filters.</div> : null}
      </div>
    </div>
  );
}
