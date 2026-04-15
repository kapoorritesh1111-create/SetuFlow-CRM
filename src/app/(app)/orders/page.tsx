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
  const supabase = createClient();

  // 1 — fetch accepted/sent quotes
  const { data: quoteRows } = await supabase
    .from("quotes")
    .select("*")
    .in("status", ["accepted", "sent"]);

  // ✅ FIX: force correct typing (prevents `never`)
  const quotes: QuoteRow[] = (quoteRows ?? []) as QuoteRow[];

  const quoteIds = quotes.map((q) => q.id);
  const leadIds = [...new Set(quotes.map((q) => q.lead_id))];

  // 2 — fetch related leads
  const { data: leadRows } = await supabase
    .from("leads")
    .select("*")
    .in("id", leadIds);

  // ✅ FIX: type leads properly
  const leads: LeadRow[] = (leadRows ?? []) as LeadRow[];

  const leadMap = new Map(leads.map((l) => [l.id, l]));

  // 3 — fetch documents
  const { data: documents } = await supabase
    .from("quote_documents")
    .select("*")
    .in("quote_id", quoteIds);

  // 4 — fetch compliance
  const { data: compliance } = await supabase
    .from("lead_compliance_items")
    .select("*")
    .in("lead_id", leadIds);

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
              <strong>Lead:</strong>{" "}
              {lead?.company_name || lead?.name || "Unknown"}
            </div>
          </div>
        );
      })}
    </div>
  );
}
