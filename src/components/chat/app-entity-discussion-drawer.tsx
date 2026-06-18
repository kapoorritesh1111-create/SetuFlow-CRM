"use client";

import { useMemo, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { ChatThread } from "@/components/chat/chat-thread";

type Props = {
  organizationId: string;
  currentUserId: string;
  currentUserName: string;
};

function firstParam(params: URLSearchParams, names: string[]) {
  for (const name of names) {
    const value = params.get(name)?.trim();
    if (value) return value;
  }
  return null;
}

export function AppEntityDiscussionDrawer({ organizationId, currentUserId, currentUserName }: Props) {
  const pathname = usePathname();
  const params = useSearchParams();
  const [open, setOpen] = useState(false);

  const target = useMemo(() => {
    if (pathname === "/quotes") {
      const quoteId = firstParam(params, ["quoteId", "quote_id"]);
      if (quoteId) return { type: "quote", id: quoteId, label: "Quote Discussion", title: "Selected quote discussion" };
    }
    if (pathname === "/orders") {
      const shipmentId = firstParam(params, ["shipmentId", "shipment_id", "dispatchId", "dispatch_id"]);
      if (shipmentId) return { type: "dispatch", id: shipmentId, label: "Dispatch Discussion", title: "Selected dispatch discussion" };
      const orderId = firstParam(params, ["orderId", "order_id"]);
      if (orderId) return { type: "order", id: orderId, label: "Order Discussion", title: "Selected order discussion" };
    }
    return null;
  }, [params, pathname]);

  if (!target) return null;

  return (
    <div style={{ position: "fixed", right: 20, bottom: 20, zIndex: 60 }}>
      {!open ? (
        <button type="button" onClick={() => setOpen(true)} style={{ border: 0, borderRadius: 999, background: "linear-gradient(135deg,#0f2744,#279491)", color: "white", padding: "12px 16px", boxShadow: "0 18px 38px rgba(15,39,68,.25)", fontSize: 12, fontWeight: 900, cursor: "pointer" }}>
          {target.label}
        </button>
      ) : (
        <section style={{ width: "min(520px, calc(100vw - 32px))", height: "min(680px, calc(100vh - 56px))", display: "flex", flexDirection: "column", borderRadius: 24, overflow: "hidden", border: "1px solid #dbe7ea", background: "white", boxShadow: "0 26px 70px rgba(15,39,68,.24)" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: "12px 14px", background: "linear-gradient(135deg,#0f2744,#1F487C)", color: "white" }}>
            <div>
              <div style={{ fontSize: 10, fontWeight: 900, letterSpacing: ".14em", textTransform: "uppercase", color: "#9ff3ef" }}>{target.label}</div>
              <strong style={{ fontSize: 14 }}>{target.title}</strong>
            </div>
            <button type="button" onClick={() => setOpen(false)} style={{ border: "1px solid rgba(255,255,255,.28)", borderRadius: 999, background: "rgba(255,255,255,.12)", color: "white", padding: "6px 10px", fontSize: 11, fontWeight: 850, cursor: "pointer" }}>Close</button>
          </div>
          <ChatThread entityType={target.type} entityId={target.id} organizationId={organizationId} autoCreateTitle={target.title} compact currentUserId={currentUserId} currentUserName={currentUserName} />
        </section>
      )}
    </div>
  );
}

export default AppEntityDiscussionDrawer;
