"use client";

import { useEffect, useState, useCallback } from "react";
import { createBrowserClient } from "@/lib/supabase/client";

export interface ReviewItem {
  id: string;
  organization_id: string;
  source_type: string;
  source_id: string;
  chunk_index: number;
  content: string;
  confidence: number;
  created_at: string;
}

type ActionType = "approve" | "reject";

export function ReviewQueue({ organizationId }: { organizationId: string }) {
  const [queue, setQueue] = useState<ReviewItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // createBrowserClient is memoized by Next.js/Supabase, but keeping it stable is good practice.
  const supabase = createBrowserClient();

  const fetchQueue = useCallback(async (abortSignal?: AbortSignal) => {
    setLoading(true);
    setErrorMsg(null);

    try {
      const { data, error } = await supabase
        .from("guru_review_queue")
        .select("*")
        .eq("organization_id", organizationId)
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Only update state if the component is still mounted
      if (!abortSignal?.aborted && data) {
        setQueue(data);
      }
    } catch (err: unknown) {
      if (!abortSignal?.aborted) {
        console.error("[ReviewQueue] Fetch failed:", err);
        setErrorMsg("Failed to load the review queue. Please refresh the page.");
      }
    } finally {
      if (!abortSignal?.aborted) {
        setLoading(false);
      }
    }
  }, [organizationId, supabase]);

  useEffect(() => {
    const controller = new AbortController();
    void fetchQueue(controller.signal);
    
    // Cleanup function to prevent memory leaks if the component unmounts
    return () => controller.abort();
  }, [fetchQueue]);

  const handleAction = async (item: ReviewItem, action: ActionType) => {
    // Prevent double submissions
    if (processingId) return; 
    
    setProcessingId(item.id);
    setErrorMsg(null);

    try {
      // Security Fix: Route BOTH actions through the secure backend API.
      // This enforces server-side validation, logging, and avoids exposing raw DB delete access on the client.
      const res = await fetch("/api/setu-guru/review-action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, item }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || `Failed to ${action} chunk`);
      }

      // Optimistic UI Update: Remove the item from the queue immediately upon success
      setQueue((prev) => prev.filter((q) => q.id !== item.id));
    } catch (err: unknown) {
      console.error(`[ReviewQueue] Action '${action}' failed:`, err);
      setErrorMsg(err instanceof Error ? err.message : "An unexpected error occurred. Please try again.");
    } finally {
      setProcessingId(null);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: 40, textAlign: "center", color: "#64748b" }}>
        Loading Review Queue...
      </div>
    );
  }

  if (queue.length === 0) {
    return (
      <div style={{ padding: 40, textAlign: "center", color: "#64748b", background: "#f8fafc", borderRadius: 12 }}>
        <h3 style={{ margin: "0 0 8px 0", color: "#0f2744" }}>All caught up!</h3>
        <p style={{ margin: 0 }}>No low-confidence documents pending review.</p>
      </div>
    );
  }

  return (
    <div style={{ padding: 20, maxWidth: 900, margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <h2 style={{ margin: 0, color: "#0f2744" }}>Human Review Queue</h2>
        <span style={{ background: "#fee2e2", color: "#b91c1c", padding: "4px 12px", borderRadius: 999, fontSize: 12, fontWeight: 700 }}>
          {queue.length} Pending
        </span>
      </div>

      {/* Graceful Error Display */}
      {errorMsg && (
        <div style={{ background: "#fee2e2", color: "#b91c1c", padding: "12px 16px", borderRadius: 8, marginBottom: 16, fontSize: 13, fontWeight: 500 }}>
          {errorMsg}
        </div>
      )}

      <div style={{ display: "grid", gap: 16 }}>
        {queue.map((item) => (
          <div key={item.id} style={{ border: "1px solid #e2e8f0", borderRadius: 12, padding: 16, background: "#fff", boxShadow: "0 2px 4px rgba(0,0,0,0.02)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12, fontSize: 12, color: "#64748b" }}>
              <span>Source: <strong>{item.source_type}</strong> ({item.source_id})</span>
              <span style={{ color: item.confidence < 0.5 ? "#b91c1c" : "#d97706", fontWeight: 600 }}>
                Confidence: {(item.confidence * 100).toFixed(1)}%
              </span>
            </div>
            
            <div style={{ background: "#f8fafc", padding: 12, borderRadius: 8, fontSize: 13, color: "#334155", marginBottom: 16, maxHeight: 150, overflowY: "auto", fontFamily: "monospace", whiteSpace: "pre-wrap" }}>
              {item.content}
            </div>

            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <button 
                onClick={() => handleAction(item, "reject")}
                disabled={processingId !== null}
                style={{ 
                  padding: "8px 16px", 
                  borderRadius: 6, 
                  border: "1px solid #e2e8f0", 
                  background: "#fff", 
                  color: "#dc2626", 
                  cursor: processingId !== null ? "not-allowed" : "pointer", 
                  fontWeight: 600,
                  opacity: processingId !== null && processingId !== item.id ? 0.5 : 1
                }}
              >
                {processingId === item.id ? "Processing..." : "Reject (Discard)"}
              </button>
              <button 
                onClick={() => handleAction(item, "approve")}
                disabled={processingId !== null}
                style={{ 
                  padding: "8px 16px", 
                  borderRadius: 6, 
                  border: "none", 
                  background: "#279491", 
                  color: "#fff", 
                  cursor: processingId !== null ? "not-allowed" : "pointer", 
                  fontWeight: 600,
                  opacity: processingId !== null && processingId !== item.id ? 0.5 : 1
                }}
              >
                {processingId === item.id ? "Processing..." : "Approve & Index"}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}