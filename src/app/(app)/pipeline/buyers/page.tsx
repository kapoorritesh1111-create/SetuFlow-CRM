import { redirect } from 'next/navigation';

export default function DeprecatedRouteRedirect() {
  redirect('/pipeline?mode=buyers');
}
