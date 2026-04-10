import { redirect } from 'next/navigation';

export default function DeprecatedRouteRedirect() {
  redirect('/leads?mode=buyers');
}
