import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default function WorkspaceCapturePage() {
  redirect('/contact-exchange/scan');
}
