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
.psuite{font-size:11px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:#1f487c;margin:18px 4px 8px}
.plink{display:inline-flex;align-items:center;gap:5px;font-size:12px;color:#1f487c;font-weight:600;text-decoration:none;background:#eef4fb;border:1px solid #cfe0f0;border-radius:7px;padding:4px 9px;margin-top:6px}
`;

export default async function TokenRunPage({ params }: { params: { token: string } }) {
  const svc = createServiceRoleClient() as any;
  const { data: link } = await svc.from('qa_share_links').select('*').eq('token', params.token).eq('link_type', 'tester_run').maybeSingle();
  const invalid = !link || link.revoked_at || (link.expires_at && new Date(link.expires_at).getTime() < Date.now());

  let title = 'Testing link'; let cases: any[] = []; let allSuites = false;
  if (!invalid) {
    const sel = 'case_key, suite_key, title, instruction, expected_result, is_critical, target_path, sort_order';
    if (link.suite_key) {
      const { data: s } = await svc.from('qa_test_suites').select('suite_key, title').eq('suite_key', link.suite_key).maybeSingle();
      title = s?.title ?? 'Guided test';
      const { data: c } = await svc.from('qa_test_cases').select(sel).eq('suite_key', link.suite_key).order('sort_order', { ascending: true });
      cases = (c ?? []).map((x: any) => ({ ...x, suite_title: title }));
    } else {
      allSuites = true; title = 'Full guided test — all suites';
      const { data: suites } = await svc.from('qa_test_suites').select('suite_key, title, sort_order').order('sort_order', { ascending: true });
      const { data: c } = await svc.from('qa_test_cases').select(sel).order('sort_order', { ascending: true });
      const titleByKey: Record<string, string> = {}; const orderByKey: Record<string, number> = {};
      (suites ?? []).forEach((s: any, i: number) => { titleByKey[s.suite_key] = s.title; orderByKey[s.suite_key] = i; });
      cases = (c ?? []).map((x: any) => ({ ...x, suite_title: titleByKey[x.suite_key] ?? x.suite_key }))
        .sort((a: any, b: any) => (orderByKey[a.suite_key] ?? 99) - (orderByKey[b.suite_key] ?? 99) || (a.sort_order ?? 0) - (b.sort_order ?? 0));
    }
  }

  return (
    <div className="pwrap">
      <style dangerouslySetInnerHTML={{ __html: STYLE }} />
      <div className="phead"><div className="b">SETU Flow · Guided Test{allSuites ? ' · All suites' : ''}</div><h1>{invalid ? 'Testing link' : title}</h1></div>
      <div className="pmain">
        {invalid || cases.length === 0 ? (
          <div className="pcard"><h3>This testing link isn&rsquo;t available</h3><p style={{ color: '#64748b', fontSize: 13, marginTop: 6 }}>It may have expired or been revoked. Please ask your SETU Flow contact for a new link.</p></div>
        ) : (
          <TokenRunBoard token={params.token} cases={cases} multiSuite={allSuites} />
        )}
      </div>
    </div>
  );
}
