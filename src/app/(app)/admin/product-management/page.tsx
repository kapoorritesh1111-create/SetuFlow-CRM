import { redirect } from 'next/navigation';
export default function AdminRouteRedirect() { redirect('/admin?section=categories'); }
