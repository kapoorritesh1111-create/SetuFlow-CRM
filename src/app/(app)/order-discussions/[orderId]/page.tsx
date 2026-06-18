import Link from "next/link";
import { EmptyState } from "@/components/ui/empty-state";
import { ChatThread } from "@/components/chat/chat-thread";
import { hasSupabaseEnv } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import { getWorkspaceAccess } from "@/lib/workspace/auth";

export default async function OrderDiscussionPage({ params }: { params: { orderId: string } }) {
  const workspace = await getWorkspaceAccess();
  if (!workspace.user || !workspace.organization) return <EmptyState title="Workspace required" description="Sign in with an active organization membership." />;
  if (!hasSupabaseEnv) return <EmptyState title="Configuration required" description="Supabase environment variables are not set." />;
  const db = (await createClient()) as any;
  const orgId = workspace.organization.id;
  const { data: order, error } = await db.from("orders").select("id, order_number, status, dispatch_status").eq("organization_id", orgId).eq("id", params.orderId).maybeSingle();
  if (error || !order) return <EmptyState title="Order not found" description="Could not find this order in the active workspace." />;
  const currentUserName = workspace.profile?.full_name ?? workspace.user.email ?? "Team member";
  const orderLabel = order.order_number || order.id;
  return <div style={{ padding: 24, minHeight: "100vh", background: "#f5f8fb" }}><div style={{ maxWidth: 1080, margin: "0 auto", display: "grid", gap: 16 }}><div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}><div><div style={{ fontSize: 11, fontWeight: 900, letterSpacing: ".14em", textTransform: "uppercase", color: "#279491" }}>Order Discussion</div><h1 style={{ margin: "4px 0 0", color: "#0f2744", fontSize: 26, fontWeight: 950 }}>Order {orderLabel}</h1><p style={{ margin: "6px 0 0", color: "#64748b", fontSize: 13 }}>Team thread linked to this order.</p></div><Link href="/orders" style={{ border: "1px solid #dbe7ea", borderRadius: 999, padding: "9px 14px", background: "white", color: "#0f2744", fontWeight: 850, fontSize: 12, textDecoration: "none" }}>Back to orders</Link></div><section style={{ border: "1px solid #dbe7ea", borderRadius: 24, background: "white", boxShadow: "0 18px 50px rgba(15,39,68,.08)", overflow: "hidden" }}><ChatThread entityType="order" entityId={params.orderId} organizationId={orgId} autoCreateTitle={`Order ${orderLabel} discussion`} autoEnrollUsers={[]} currentUserId={workspace.user.id} currentUserName={currentUserName} /></section></div></div>;
}
