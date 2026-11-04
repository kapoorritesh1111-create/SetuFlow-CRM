import { redirect } from 'next/navigation';

// All lead lists must use the authenticated, RLS-scoped canonical CRM data
// source. The previous standalone version could display bundled demo leads.
export default function MobileLeadsPage() {
  redirect('/leads');
}
