import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getWorkspaceAccess } from '@/lib/workspace/auth';
import { buildSetuGuruBrainAnswer } from '@/lib/setu-guru/brain-layer';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

const BrainRequestSchema = z.object({
  question: z.string().trim().min(1).max(2000),
  route: z.string().trim().max(300).optional(),
  conversation_id: z.string().optional(),
});

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const parsed = BrainRequestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ answer: 'Invalid request' }, { status: 400 });
    }

    const workspace = await getWorkspaceAccess();
    if (!workspace.user || !workspace.organization) {
      return NextResponse.json({ answer: 'Unauthorized' }, { status: 401 });
    }

    const qText = parsed.data.question.toLowerCase().trim();
    let replyText = "";

    // Greetings handler
    if (["hi", "hello", "hey", "hii", "namaste"].includes(qText)) {
      replyText = `Hello ${workspace.user.name || 'there'}! How can I help you with Setu Flow today?`;
    } else {
      const result = buildSetuGuruBrainAnswer({
        question: parsed.data.question,
        route: parsed.data.route,
        organizationName: workspace.organization.name,
        roleLabel: workspace.currentRoles.join(', '),
      });
      replyText = result.answer || 'No response generated.';
    }

    // Database persistence with explicit error logging
    if (parsed.data.conversation_id) {
      const cookieStore = cookies();
      const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
          cookies: {
            get(name: string) { return cookieStore.get(name)?.value; },
          },
        }
      );

      // Insert user question
      const { error: userError } = await supabase.from('chat_messages').insert({
        conversation_id: parsed.data.conversation_id,
        content: parsed.data.question,
        sender_id: workspace.user.id,
        sender_name: workspace.user.name || 'User',
      });
      if (userError) {
        console.error("❌ USER MESSAGE INSERT ERROR:", userError.message);
      }

      // Insert AI answer
      const { error: aiError } = await supabase.from('chat_messages').insert({
        conversation_id: parsed.data.conversation_id,
        content: replyText,
        sender_id: workspace.user.id,
        sender_name: 'Setu Guru',
      });
      if (aiError) {
        console.error("❌ AI MESSAGE INSERT ERROR:", aiError.message);
      }
    }

    return NextResponse.json({
      answer: replyText,
      confidence: 'high',
      rows: []
    });
  } catch (error) {
    console.error("❌ CRITICAL ROUTE ERROR:", error);
    return NextResponse.json({ answer: 'Error processing request' }, { status: 500 });
  }
}