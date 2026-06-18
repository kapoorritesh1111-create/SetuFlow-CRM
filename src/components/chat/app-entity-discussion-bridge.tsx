"use client";

import { useEffect, useState } from "react";
import { AppEntityDiscussionDrawer } from "@/components/chat/app-entity-discussion-drawer";
import { CrmChatFab } from "@/components/chat/crm-chat-fab";

type ChatContext = {
  organization_id: string;
  user_id: string;
  user_name: string;
  members?: { id: string; name: string; role: string }[];
};

export function AppEntityDiscussionBridge() {
  const [context, setContext] = useState<ChatContext | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function loadContext() {
      try {
        const res = await fetch("/api/chat/context", { cache: "no-store" });
        if (!res.ok) return;
        const data = await res.json();
        if (!cancelled && data.organization_id && data.user_id) {
          setContext(data as ChatContext);
        }
      } catch {
        // Discussion bridge is optional and should not block the workspace shell.
      }
    }
    void loadContext();
    return () => { cancelled = true; };
  }, []);

  if (!context) return null;

  return (
    <>
      <CrmChatFab
        organizationId={context.organization_id}
        currentUserId={context.user_id}
        currentUserName={context.user_name}
        orgMembers={context.members ?? []}
      />
      <AppEntityDiscussionDrawer
        organizationId={context.organization_id}
        currentUserId={context.user_id}
        currentUserName={context.user_name}
      />
    </>
  );
}

export default AppEntityDiscussionBridge;
