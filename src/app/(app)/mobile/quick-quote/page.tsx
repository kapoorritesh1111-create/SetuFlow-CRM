import { redirect } from 'next/navigation';

// The PWA uses the same responsive, authenticated pricing workbench as desktop.
export default function MobileQuickQuotePage() {
  redirect('/quick-quote');
}
