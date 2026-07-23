import { redirect } from 'next/navigation';

// This standalone route is superseded by the canonical /quotes mobile branch
// (src/app/(app)/quotes/page.tsx renders <MobileQuotesList> at md:hidden).
// Kept as a redirect rather than deleted so old links/bookmarks still land
// somewhere real.
export default function MobileQuoteRedirectPage() {
  redirect('/quotes');
}
