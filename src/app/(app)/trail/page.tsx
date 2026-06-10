import { redirect } from 'next/navigation';

// S24-TRIAL-203 Pass A: users frequently type /trail; the product route is /trial.
export default function TrailTypoRedirectPage() {
  redirect('/trial');
}
