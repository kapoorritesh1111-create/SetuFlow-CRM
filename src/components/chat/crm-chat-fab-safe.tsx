"use client";

import { useEffect, useState } from "react";
import { ChatThread } from "@/components/chat/chat-thread";

interface CrmChatFabProps {
  organizationId: string;
  currentUserId: string;
  currentUserName: string;
  orgMembers?: { id: string; name: string; role: string }[];
}

type Conv = { id: string; channel_key?: string; conversation_type: string; title?: string; unread_count?: number };
const CHANNELS = ["general", "sales", "orders", "approvals"];

function initials(name: string) {
  return name.split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase() || "DM";
}

export function CrmChatFab({ organizationId, currentUserId, currentUserName, orgMembers = [] }: CrmChatFabProps) {
  const [open, setOpen] = useState(false);
  const [activeChannel, setActiveChannel] = useState("general");
  const [activeConvId, setActiveConvId] = useState<string | null>(null);
  const [view, setView] = useState<"chat" | "dm" | "dm-chat">("chat");
  const [dmTarget, setDmTarget] = useState<{ name: string; convId: string } | null>(null);
  const [search, setSearch] = useState("");
  const [convs, setConvs] = useState<Conv[]>([]);

  useEffect(() => {
    if (!open || !organizationId) return;
    const load = () => fetch(`/api/chat/conversations?organization_id=${organizationId}`, { cache: "no-store" })
      .then((res) => res.json())
      .then((data) => {
        const rows = (data.conversations ?? []) as Conv[];
        setConvs(rows);
        const channel = rows.find((conv) => conv.channel_key === activeChannel);
        if (channel && view === "chat") setActiveConvId(channel.id);
      })
      .catch(() => {});
    load();
    const timer = window.setInterval(load, 5000);
    return () => window.clearInterval(timer);
  }, [activeChannel, open, organizationId, view]);

  async function openDm(memberId: string, memberName: string) {
    setView("dm-chat");
    setDmTarget({ name: memberName, convId: "" });
    const res = await fetch("/api/chat/dm", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ organization_id: organizationId, recipient_id: memberId, recipient_name: memberName }) });
    const data = await res.json();
    if (data.conversation_id) {
      setDmTarget({ name: memberName, convId: data.conversation_id });
      setActiveConvId(data.conversation_id);
    }
  }

  if (!organizationId || !currentUserId) return null;

  const unread = convs.reduce((sum, conv) => sum + (conv.unread_count ?? 0), 0);
  const dmUnread = convs.filter((conv) => conv.conversation_type === "dm").reduce((sum, conv) => sum + (conv.unread_count ?? 0), 0);
  const dms = convs.filter((conv) => conv.conversation_type === "dm" && conv.title);
  const members = orgMembers.filter((member) => member.id !== currentUserId && member.name.toLowerCase().includes(search.toLowerCase()));

  return <>
    {!open ? <button type="button" onClick={() => setOpen(true)} className="fixed bottom-4 left-14 z-50 rounded-full bg-[#0f2744] px-4 py-3 text-sm font-bold text-white shadow-xl">Chat{unread > 0 ? <span className="ml-2 rounded-full bg-red-500 px-2 py-0.5 text-xs">{unread}</span> : null}</button> : null}
    {open ? <div onClick={() => setOpen(false)} className="fixed inset-0 z-[9989]" /> : null}
    {open ? <div className="fixed bottom-4 left-14 z-[9990] flex w-[min(420px,calc(100vw-72px))] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl" style={{ height: "min(560px, calc(100vh - 100px))", flexDirection: "column" }}>
      <div className="flex items-center justify-between bg-[#1F487C] px-3 py-2 text-white">
        <div className="text-sm font-bold">{view === "dm-chat" ? dmTarget?.name : view === "dm" ? "Direct Messages" : `#${activeChannel}`}</div>
        <button type="button" onClick={() => setOpen(false)} className="rounded bg-white/10 px-2 py-1 text-xs">Close</button>
      </div>
      <div className="flex gap-1 border-b bg-slate-50 px-2 py-2 text-xs font-bold text-slate-500">
        {CHANNELS.map((key) => <button key={key} type="button" onClick={() => { setView("chat"); setActiveChannel(key); setActiveConvId(convs.find((conv) => conv.channel_key === key)?.id ?? null); }} className={view === "chat" && activeChannel === key ? "rounded border border-teal-500 bg-teal-50 px-2 py-1 text-teal-700" : "rounded px-2 py-1"}># {key}</button>)}
        <button type="button" onClick={() => setView("dm")} className="ml-auto rounded border border-teal-500 px-2 py-1 text-teal-700">DM{dmUnread > 0 ? <span className="ml-1 rounded-full bg-red-500 px-1.5 text-[10px] text-white">{dmUnread}</span> : null}</button>
      </div>
      <div className="min-h-0 flex-1 overflow-hidden">
        {view === "chat" && activeConvId ? <ChatThread key={activeConvId} conversationId={activeConvId} organizationId={organizationId} currentUserId={currentUserId} currentUserName={currentUserName} compact /> : null}
        {view === "chat" && !activeConvId ? <div className="p-6 text-center text-sm text-slate-400">Loading...</div> : null}
        {view === "dm-chat" && dmTarget?.convId ? <ChatThread key={dmTarget.convId} conversationId={dmTarget.convId} organizationId={organizationId} currentUserId={currentUserId} currentUserName={currentUserName} compact /> : null}
        {view === "dm" ? <div className="flex h-full flex-col"><div className="border-b p-3"><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search team members" className="w-full rounded-xl border px-3 py-2 text-sm outline-none" /></div><div className="flex-1 overflow-y-auto p-3"><div className="mb-2 text-[10px] font-black uppercase text-slate-400">Active Conversations</div>{dms.map((dm) => <button key={dm.id} type="button" onClick={() => { setView("dm-chat"); setDmTarget({ name: dm.title ?? "Direct Message", convId: dm.id }); setActiveConvId(dm.id); }} className="mb-1 flex w-full items-center gap-3 rounded-xl p-2 text-left hover:bg-slate-50"><span className="grid h-9 w-9 place-items-center rounded-full bg-teal-600 text-xs font-bold text-white">{initials(dm.title ?? "DM")}</span><span className="flex-1 text-sm font-bold text-slate-800">{dm.title}</span>{dm.unread_count ? <span className="rounded-full bg-red-500 px-2 text-xs font-bold text-white">{dm.unread_count}</span> : null}</button>)}<div className="my-2 text-[10px] font-black uppercase text-slate-400">Team Members</div>{members.map((member) => <button key={member.id} type="button" onClick={() => openDm(member.id, member.name)} className="mb-1 flex w-full items-center gap-3 rounded-xl p-2 text-left hover:bg-slate-50"><span className="grid h-9 w-9 place-items-center rounded-full bg-violet-600 text-xs font-bold text-white">{initials(member.name)}</span><span className="text-sm font-bold text-slate-800">{member.name}</span></button>)}</div></div> : null}
      </div>
    </div> : null}
  </>;
}
