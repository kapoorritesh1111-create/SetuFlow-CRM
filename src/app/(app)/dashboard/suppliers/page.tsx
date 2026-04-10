import { redirect } from 'next/navigation';

export default function DeprecatedRouteRedirect() {
  redirect('/dashboard?mode=suppliers');
}
