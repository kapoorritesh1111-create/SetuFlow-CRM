import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { ensureConversationAccess, getAuthenticatedChatUser } from "@/lib/chat/api-helpers";

export const dynamic = "force-dynamic";

const BUCKET = "chat-attachments";
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB limit

function uuid(value: FormDataEntryValue | null) {
  const text = typeof value === "string" ? value : null;
  return text && /^[0-9a-fA-F-]{36}$/.test(text) ? text : null;
}

function safeFileName(name: string) {
  const fallback = "attachment";
  const cleaned = name.normalize("NFKD").replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
  return (cleaned || fallback).slice(0, 160);
}

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedChatUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const admin = createServiceRoleClient();
    if (!admin) return NextResponse.json({ error: "Service unavailable" }, { status: 503 });

    const form = await request.formData();
    const file = form.get("file");
    const conversationId = uuid(form.get("conversation_id"));
    const messageId = uuid(form.get("message_id")) ?? `pending-${Date.now()}`;

    if (!conversationId) return NextResponse.json({ error: "Conversation required" }, { status: 400 });
    if (!(file instanceof File)) return NextResponse.json({ error: "File required" }, { status: 400 });
    if (file.size > MAX_FILE_SIZE) return NextResponse.json({ error: "File must be 10MB or smaller" }, { status: 413 });

    const organizationId = await ensureConversationAccess(admin, user.id, conversationId);
    if (!organizationId) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const filename = safeFileName(file.name || "attachment");
    const storagePath = `${organizationId}/${conversationId}/${messageId}/${Date.now()}-${filename}`;

    const { error } = await admin.storage.from(BUCKET).upload(storagePath, file, {
      contentType: file.type || "application/octet-stream",
      upsert: false,
    });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const { data } = admin.storage.from(BUCKET).getPublicUrl(storagePath);

    // --- TRIGGER SETU GURU INGESTION WEBHOOK (Only for PDFs) ---
    // FIX: previously fire-and-forget (no await). In a serverless function the
    // process can be frozen/terminated as soon as the response returns, so the
    // background fetch often never completed. Now we await it and log failures.
    if (file.type === "application/pdf") {
      try {
        console.log(`Triggering Ingestion Webhook for PDF: ${filename}`);
        const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

        const ingestRes = await fetch(`${appUrl}/api/setu-guru/ingest`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-webhook-secret": process.env.WEBHOOK_SECRET_SETU_GURU_INGEST || ""
          },
          body: JSON.stringify({
            organizationId: organizationId,
            sourceType: "chat_attachment",
            sourceId: crypto.randomUUID(),
            fileUrl: data.publicUrl,
            mimeType: "application/pdf"
          })
        });

        if (!ingestRes.ok) {
          console.error("Webhook failed:", ingestRes.status, await ingestRes.text());
        }
      } catch (webhookErr) {
        console.error("Failed to trigger ingest webhook:", webhookErr);
      }
    }
    // -----------------------------------------------------------

    return NextResponse.json({
      attachment: {
        name: file.name || filename,
        url: data.publicUrl,
        size: file.size,
        type: file.type || "application/octet-stream",
        storage_path: storagePath,
      },
    }, { status: 201 });
  } catch (err) {
    console.error("Chat upload POST error:", err);
    return NextResponse.json({ error: "Failed to upload attachment" }, { status: 500 });
  }
}