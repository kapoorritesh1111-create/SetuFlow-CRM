import { NextResponse } from 'next/server';
import { getLeadsPageData } from '@/lib/queries/leads';
import { getWorkspaceAccess } from '@/lib/workspace/auth';

export const dynamic = 'force-dynamic';

export async function GET() {
  const workspace = await getWorkspaceAccess();

  if (!workspace.membership || !workspace.organization) {
    return NextResponse.json({ leads: [] }, { status: 200 });
  }

  const data = await getLeadsPageData(workspace.organization.id);

  if (!data) {
    return NextResponse.json({ leads: [] }, { status: 200 });
  }

  return NextResponse.json({
    leads: data.leads.map((lead) => ({
      id: lead.id,
      company_name: lead.company_name,
      contact_name: lead.contact_name ?? null,
      email: lead.email ?? null,
      phone: lead.phone ?? null,
      whatsapp_number: (lead as any).whatsapp_number ?? null,
    })),
  });
}
