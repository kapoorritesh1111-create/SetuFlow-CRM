import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { RunBoard } from './run-board';

export const dynamic = 'force-dynamic';

export default async function QaRunPage({ params }: { params: { suiteKey: string } }) {
  const supabase = await createClient();
  const sb = supabase as any;
  const { data: suite } = await sb.from('qa_test_suites').select('suite_key, title, area, how_to_test, environment').eq('suite_key', params.suiteKey).maybeSingle();
  if (!suite) notFound();
  const { data: cases } = await sb.from('qa_test_cases')
    .select('case_key, title, instruction, expected_result, is_critical, target_path, sort_order')
    .eq('suite_key', params.suiteKey).order('sort_order', { ascending: true });

  return (
    <>
      <div className="smc-ph">
        <div><div className="bc">Delivery · Quality · Run</div><h1>{suite.title}</h1><p>{suite.how_to_test || 'Mark each step. A failure captures full context so the finding is reproducible.'}</p></div>
        <div className="ha"><Link href="/smc/qa" className="smc-btn">← QA</Link></div>
      </div>
      <RunBoard
        suiteKey={suite.suite_key}
        suiteTitle={suite.title}
        environment={suite.environment || 'staging'}
        cases={(cases ?? []) as any[]}
      />
    </>
  );
}
