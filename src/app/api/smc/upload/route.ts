import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

export const dynamic = "force-dynamic";

const SETU_ORG_ID = "3327b9a7-aadb-44b0-9793-30c4045d3c92";
const BUCKET = "smc-attachments";
const MAX_BYTES = 10 * 1024 * 1024;

async function assertSetuMember() {
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return { userId: null, error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }

  const { data: member, error: memberError } = await supabase
    .from("organization_members")
    .select("id")
    .eq("organization_id", SETU_ORG_ID)
    .eq("user_id", user.id)
    .maybeSingle();

  if (memberError) {
    return { userId: user.id, error: NextResponse.json({ error: "Unable to verify SMC access" }, { status: 500 }) };
  }

  if (!member) {
    return { userId: user.id, error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }

  return { userId: user.id, error: null };
}

function safeName(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/-+/g, "-").slice(0, 120) || "attachment";
}

export async function POST(request: NextRequest) {
  try {
    const { userId, error } = await assertSetuMember();
    if (error) return error;

    const service = createServiceRoleClient();
    if (!service) return NextResponse.json({ error: "Storage client unavailable" }, { status: 500 });

    const form = await request.formData();
    const file = form.get("file");
    const issueRef = typeof form.get("issue_ref") === "string" ? String(form.get("issue_ref")) : "general";

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Missing file" }, { status: 400 });
    }
    if (file.size > MAX_BYTES) {
      return NextResponse.json({ error: "File exceeds 10MB limit" }, { status: 413 });
    }

    const path = `${SETU_ORG_ID}/${safeName(issueRef)}/${Date.now()}-${safeName(file.name)}`;
    const { error: uploadError } = await service.storage.from(BUCKET).upload(path, file, {
      cacheControl: "3600",
      contentType: file.type || "application/octet-stream",
      upsert: false,
    });

    if (uploadError) throw uploadError;

    const { data } = service.storage.from(BUCKET).getPublicUrl(path);
    return NextResponse.json({
      url: data.publicUrl,
      path,
      name: file.name,
      size: file.size,
      type: file.type,
      uploaded_by: userId,
    });
  } catch (err) {
    console.error("SMC upload error:", err);
    return NextResponse.json({ error: "Failed to upload attachment" }, { status: 500 });
  }
}
