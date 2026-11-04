import { redirect } from 'next/navigation';

// The former standalone pipeline view called a nonexistent /api/mobile/pipeline-summary
// endpoint and displayed false zero totals. Use the real authenticated CRM lead
// workspace until an independently verified mobile pipeline can be delivered.
export default function MobilePipelinePage() {
  redirect('/leads');
}
