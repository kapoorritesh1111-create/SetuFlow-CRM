import { createServiceRoleClient } from '@/lib/supabase/service-role';
import { TokenRunBoard } from './token-run-board';

export const dynamic = 'force-dynamic';

const STYLE = `
.pwrap{min-height:100vh;background:#f1f5f9;font-family:'DM Sans',system-ui,sans-serif;color:#1e293b}
.phead{background:linear-gradient(135deg,#1f487c,#279491);color:#fff;padding:18px 22px}
.phead .b{font-size:11px;letter-spacing:.08em;text-transform:uppercase;opacity:.85}
.phead h1{font-size:20px;margin-top:2px}
.pmain{max-width:860px;margin:0 auto;padding:20px 18px}
.pcard{background:#fff;border:1px solid #e2e8f0;border-radius:12px;padding:16px;margin-bottom:12px}
.pbtn{font:inherit;font-size:13px;font-weight:600;padding:8px 14px;border-radius:8px;border:1px solid #e2e8f0;background:#fff;color:#334155;cursor:pointer}
.pbtn.primary{background:linear-gradient(135deg,#1f487c,#279491);color:#fff;border:none}
.pbtn:disabled{opacity:.5;cursor:not-allowed}
.pinp{width:100%;font:inherit;font-size:13px;padding:8px 10px;border:1px solid #e2e8f0;border-radius:8px;margin-top:6px}
`;

export default async function TokenRunPage({ params }: { params: { token: string } }) {
  const svc = createServiceRoleClient() as any;
  const { data: link } = await svc.from('qa_share_links').select('*').eq('token', params.token).eq('link_type', 'tester_run').maybeSingle();
  const invalid = !link || link.revoked_at || (link.expires_at && new Date(link.expires_at).getTime() < Date.now());

  let suite: any = null; let cases: any[] = [];
  if (!invalid) {
    const { data: s } = await svc.from('qa_test_suites').select('suite_key, title, how_to_test').eq('suite_key', link.suite_key).maybeSingle();
    suite = s;
    const { data: c } = await svc.from('qa_test_cases').select('case_key, title, instruction, expected_result, is_critical, sort_order').eq('suite_key', link.suite_key).order('sort_order', { ascending: true });
    cases = c ?? [];
  }

  return (
    <div className="pwrap">
      <style dangerouslySetInnerHTML={{ __html: STYLE }} />
      <div className="phead"><div className="b">SETU Flow · Guided Test</div><h1>{invalid || !suite ? 'Testing link' : suite.title}</h1></div>
      <div className="pmain">
        {(invalid || !suite) ? (
          <div className="pcard"><h3>This testing link isn&rsquo;t available</h3><p style={{ color: '#64748b', fontSize: 13, marginTop: 6 }}>It may have expired or been revoked. Please ask your SETU Flow contact for a new link.</p></div>
        ) : (
          <TokenRunBoard token={params.token} suiteTitle={suite.title} howTo={suite.how_to_test ?? ''} cases={cases} />
        )}
      </div>
    </div>
  );
}
