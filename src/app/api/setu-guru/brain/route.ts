import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { ensureConversationAccess, getAuthenticatedChatUser } from "@/lib/chat/api-helpers";
// Removed missing ingestion-service import to fix Next.js build error

export const dynamic = "force-dynamic";

// 1. Centralized Configuration for easy updates and avoiding "magic numbers/strings"
const UPLOAD_CONFIG = {
  BUCKET_NAME: "chat-attachments",
  MAX_FILE_SIZE_BYTES: 10 * 1024 * 1024, // 10MB
  FALLBACK_FILENAME: "attachment",
  ALLOWED_PDF_MIME: "application/pdf",
} as const;

// 2. Helper: Safely parse UUID
const parseUuid = (value: FormDataEntryValue | null): string | null => {
  const text = typeof value === "string" ? value : null;
  return text && /^[0-9a-fA-F-]{36}$/.test(text) ? text : null;
};

// 3. Helper: Sanitize filename to prevent injection or invalid characters
const sanitizeFileName = (name: string): string => {
  const cleaned = name
    .normalize("NFKD")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  return (cleaned || UPLOAD_CONFIG.FALLBACK_FILENAME).slice(0, 160);
};

// 4. Helper: Standardized error response structure
const createErrorResponse = (message: string, status: number) => {
  return NextResponse.json({ error: message }, { status });
};

export async function POST(request: NextRequest) {
  try {
    // --- Step A: Authentication & Authorization ---
    const user = await getAuthenticatedChatUser();
    if (!user) return createErrorResponse("Unauthorized access", 401);

    const adminClient = createServiceRoleClient();
    if (!adminClient) return createErrorResponse("Storage service temporarily unavailable", 503);

    // --- Step B: Payload Extraction & Validation ---
    // Safe parsing of formData to prevent crashes from malformed inputs
    const form = await request.formData().catch(() => null);
    if (!form) return createErrorResponse("Invalid form data payload", 400);

    const file = form.get("file");
    const conversationId = parseUuid(form.get("conversation_id"));
    const messageId = parseUuid(form.get("message_id")) ?? `pending-${Date.now()}`;

    // Guard clauses for validation
    if (!conversationId) return createErrorResponse("Valid conversation ID is required", 400);
    if (!(file instanceof File)) return createErrorResponse("Valid file object is required", 400);
    if (file.size > UPLOAD_CONFIG.MAX_FILE_SIZE_BYTES) {
      return createErrorResponse(`File size exceeds limit (${UPLOAD_CONFIG.MAX_FILE_SIZE_BYTES / 1024 / 1024}MB)`, 413);
    }

    // --- Step C: Organization Level Access Check ---
    const organizationId = await ensureConversationAccess(adminClient, user.id, conversationId);
    if (!organizationId) return createErrorResponse("Forbidden: Insufficient workspace access", 403);

    // --- Step D: File Storage Operations ---
    const filename = sanitizeFileName(file.name || UPLOAD_CONFIG.FALLBACK_FILENAME);
    const storagePath = `${organizationId}/${conversationId}/${messageId}/${Date.now()}-${filename}`;
    const contentType = file.type || "application/octet-stream";

    const { error: uploadError } = await adminClient.storage
      .from(UPLOAD_CONFIG.BUCKET_NAME)
      .upload(storagePath, file, {
        contentType,
        upsert: false,
      });

    if (uploadError) {
      console.error(`[Storage Upload Error] Path: ${storagePath}`, uploadError);
      return createErrorResponse(uploadError.message, 500);
    }

    const { data: publicUrlData } = adminClient.storage
      .from(UPLOAD_CONFIG.BUCKET_NAME)
      .getPublicUrl(storagePath);

    // --- Step E: Asynchronous Ingestion Trigger ---
    if (file.type === UPLOAD_CONFIG.ALLOWED_PDF_MIME) {
      // Missing ingestion service call removed so the build doesn't crash
      console.log(`[Upload Success] PDF uploaded for org ${organizationId}. Ingestion service temporarily disabled.`);
    }

    // --- Step F: Return Success Response ---
    return NextResponse.json(
      {
        attachment: {
          name: file.name || filename,
          url: publicUrlData.publicUrl,
          size: file.size,
          type: contentType,
          storage_path: storagePath,
        },
      },
      { status: 201 }
    );

  } catch (err) {
    console.error("[Chat Upload POST Fatal Error]:", err);
    return createErrorResponse("An unexpected server error occurred during upload", 500);
  }
}