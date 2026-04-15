import { createClient } from "@/lib/supabase/server";

type QuoteRow = {
  id: string;
  lead_id: string;
  status: string;
  created_at?: string;
};

type LeadRow = {
  id: string;
  name?: string | null;
  company_name?: string | null;
};

export default async function OrdersPage() {
  const supabase = await createClient();

  const { data: quoteRows } = await supabase
    .from("quotes")
    .select("*")
    .in("status", ["accepted", "sent"]);

  const quotes: QuoteRow[] = (quoteRows ?? []) as QuoteRow[];

  const quoteIds = quotes.map((q) => q.id);
  const leadIds = [...new Set(quotes.map((q) => q.lead_id))];

  const { data: leadRows } =
    leadIds.length > 0
      ? await supabase.from("leads").select("*").in("id", leadIds)
      : { data: [] as LeadRow[] };

  const leads: LeadRow[] = (leadRows ?? []) as LeadRow[];
  const leadMap = new Map(leads.map((l) => [l.id, l]));

  const { data: documents } =
    quoteIds.length > 0
      ? await supabase.from("quote_documents").select("*").in("quote_id", quoteIds)
      : { data: [] };

  const { data: compliance } =
    leadIds.length > 0
      ? await supabase
          .from("lead_compliance_items")
          .select("*")
          .in("lead_id", leadIds)
      : { data: [] };

  return (
    <div>
      <h1>Orders</h1>

      {quotes.map((q) => {
        const lead = leadMap.get(q.lead_id);

        return (
          <div key={q.id} style={{ marginBottom: 16 }}>
            <div><strong>Quote ID:</strong> {q.id}</div>
            <div><strong>Status:</strong> {q.status}</div>
            <div>
              <strong>Lead:</strong> {lead?.company_name || lead?.name || "Unknown"}
            </div>
          </div>
        );
      })}
    </div>
  );
}
