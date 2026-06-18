"use client";

import { useState } from "react";
import { ChatThread } from "@/components/chat/chat-thread";

interface DiscussionButtonProps {
  entityType: string;
  entityId: string;
  organizationId: string;
  currentUserId: string;
  currentUserName: string;
  title: string;
  autoEnrollUsers?: string[];
  label?: string;
}

export function DiscussionButton({
  entityType,
  entityId,
  organizationId,
  currentUserId,
  currentUserName,
  title,
  autoEnrollUsers,
  label,
}: DiscussionButtonProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 6,
          width: "100%",
          padding: "9px 14px",
          border: "1px solid #279491",
          borderRadius: 12,
          background: "linear-gradient(135deg, rgba(39,148,145,.06), rgba(39,148,145,.02))",
          color: "#279491",
          fontSize: 12,
          fontWeight: 700,
          cursor: "pointer",
          fontFamily: "inherit",
          transition: "all 150ms ease",
        }}
        onMouseOver={(e) => {
          e.currentTarget.style.background = "linear-gradient(135deg, rgba(39,148,145,.12), rgba(39,148,145,.05))";
        }}
        onMouseOut={(e) => {
          e.currentTarget.style.background = "linear-gradient(135deg, rgba(39,148,145,.06), rgba(39,148,145,.02))";
        }}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" width="14" height="14">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>
        {label ?? "Discussion"}
      </button>

      {open && (
        <>
          {/* Backdrop */}
          <div
            onClick={() => setOpen(false)}
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(0,0,0,.3)",
              zIndex: 9998,
            }}
          />
          {/* Drawer */}
          <div
            style={{
              position: "fixed",
              top: 0,
              right: 0,
              width: "min(480px, 100vw)",
              height: "100vh",
              background: "#fff",
              boxShadow: "-8px 0 30px rgba(0,0,0,.15)",
              zIndex: 9999,
              display: "flex",
              flexDirection: "column",
            }}
          >
            <div
              style={{
                padding: "14px 18px",
                borderBottom: "1px solid #e2e8f0",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                background: "#f8fafc",
              }}
            >
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: "#1e293b" }}>
                  {title}
                </div>
                <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 2 }}>
                  {entityType.charAt(0).toUpperCase() + entityType.slice(1)} discussion thread
                </div>
              </div>
              <button
                onClick={() => setOpen(false)}
                style={{
                  border: "none",
                  background: "none",
                  fontSize: 18,
                  cursor: "pointer",
                  color: "#94a3b8",
                  padding: "4px 8px",
                }}
              >
                ✕
              </button>
            </div>
            <div style={{ flex: 1, overflow: "hidden" }}>
              <ChatThread
                entityType={entityType}
                entityId={entityId}
                organizationId={organizationId}
                currentUserId={currentUserId}
                currentUserName={currentUserName}
                autoCreateTitle={title}
                autoEnrollUsers={autoEnrollUsers}
              />
            </div>
          </div>
        </>
      )}
    </>
  );
}
