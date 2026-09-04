import OpenAI from 'openai';
import { retrieveGuru, filterOutput } from '@/lib/rag/retrieve';
import { embedChunks } from '@/lib/rag/embedding-provider';
import { AGENTIC_TOOLS, callAgenticTool, type AgenticToolName } from '@/lib/rag/agentic-tools';
import { createClient } from '@supabase/supabase-js';

/**
 * src/lib/rag/guru-agentic-orchestrator.ts
 * Production-Grade Hybrid Orchestrator - Strict Matching & RAG Fallback enabled.
 */

const AGENTIC_MODEL = process.env.SETU_GURU_RAG_MODEL || 'gpt-4o-mini';
const MAX_TOOL_ROUNDS = 2;

let openaiClient: OpenAI | null = null;
function getOpenAI(): OpenAI {
  if (!openaiClient) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) throw new Error('OPENAI_API_KEY is not configured.');
    openaiClient = new OpenAI({ apiKey, timeout: 20000 });
  }
  return openaiClient;
}

function getAdminSupabaseClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
  );
}

const SYSTEM_PROMPT = `You are Setu Guru, an expert, professional CRM and compliance AI assistant for SetuFlow.

DESIGN, TONE & LANGUAGE GUIDELINES:
- **Language Default:** ALWAYS default to professional English. ONLY switch to Hindi/Hinglish if the user's prompt explicitly uses Hindi words.
- **Tone:** Polite, professional, and helpful. Avoid blunt or robotic phrases like "Data Not Found". Use polite alternatives.
- **Formatting:** Format pricing, product catalogs, and leads into clean, structured markdown lists with bolding (**), bullet points, and proper spacing. Use plain professional formatting only - absolutely no emojis or decorative icons anywhere in the response.
- **Guardrails:** Do not answer general knowledge, world facts, geography, or out-of-scope questions.
- **Citations:** Cite document/PDF sources cleanly using inline markers like [R1], [R2].`;

export interface AgenticQueryResult {
  answer: string;
  toolsUsed: AgenticToolName[];
  ragUsed: boolean;
  citations: Array<{ marker: string; sourceType: string; sourceId: string }>;
}

function isHindiQuery(text: string): boolean {
  const hindiKeywords = ['kya', 'kaise', 'batao', 'kahan', 'kaun', 'hai', 'hain', 'btao', 'karo', 'samjhao', 'chahiye'];
  const lower = text.toLowerCase();
  return /[\u0900-\u097F]/.test(text) || hindiKeywords.some(k => new RegExp(`\\b${k}\\b`).test(lower));
}

function getGreetingResponse(question: string): string | null {
  const clean = question.trim().toLowerCase().replace(/[?!.,]/g, '');
  const greetings = ['hi', 'hello', 'hey', 'good morning', 'good afternoon', 'good evening', 'sup', 'namaste'];
  if (greetings.includes(clean) || clean.length <= 3) {
    if (isHindiQuery(question)) {
      return "Namaste! Main Setu Guru hoon, aapka CRM aur compliance assistant. Aaj main aapke catalog, pricing, leads ya export guidelines mein kaise madad kar sakta hoon?";
    }
    return "Hello, I am Setu Guru, your CRM and compliance assistant. How can I help you with your catalog, pricing, leads, or export guidelines today?";
  }
  return null;
}

/**
 * Transforms raw database rows into clean, professional, markdown-formatted UI text.
 */
function formatToolResultsToUI(toolName: string, data: any, isHindi: boolean): string {
  if (
    !data || 
    data.error || 
    (Array.isArray(data) && data.length === 0) || 
    (data.products && Array.isArray(data.products) && data.products.length === 0)
  ) {
    return isHindi
      ? "Maaf kijiye, mujhe is waqt aapke active workspace mein iska exact match nahi mila."
      : "I couldn't find an exact match for your request in your active workspace.";
  }

  const listData = Array.isArray(data) ? data : data.products;
  const customMessage = data.message ? `_${data.message}_\n\n` : "";

  if (toolName === 'search_leads' && Array.isArray(listData) && listData.length > 0) {
    const header = customMessage || (isHindi ? "Yeh rahe aapke CRM se milte-julte leads:\n\n" : "Here are the lead details retrieved from your CRM:\n\n");
    return header + listData.map((l: any) =>
      `**${l.company_name || l.contact_name || 'Lead Details'}**\n` +
      `- Contact: ${l.contact_name || 'N/A'} (${l.job_title || 'Representative'})\n` +
      `- Email / Phone: ${l.email || 'N/A'} | ${l.phone || 'N/A'}\n` +
      `- Country / Need: ${l.country || 'N/A'} — ${l.products_or_needs || l.notes || 'General Inquiry'}\n` +
      `- Deal Value: \`$${l.deal_value ? Number(l.deal_value).toLocaleString() : '0'} USD\`\n` +
      `- Next Follow-Up: ${l.next_follow_up_date || 'Not scheduled'}`
    ).join('\n\n---\n\n');
  }

  if (toolName === 'search_catalog_and_pricing' && Array.isArray(listData) && listData.length > 0) {
    const header = customMessage || (isHindi ? "Yeh rahe active catalog aur pricing ke details:\n\n" : "Here are the active catalog and pricing details:\n\n");
    return header + listData.map((p: any) => {
      const pName = p.product_name || p.name || p.title || 'Product Item';
      const pBrand = p.brand_name || p.brand || 'SetuFlow Standard';
      const pCat = p.category_name || p.category || 'General';
      const pMoq = (p.moq != null) ? `${p.moq}` : 'N/A';
      
      const rawPrice = p.fob_usd ?? p.fob_usd_per_case ?? p.fob_usd_per_unit ?? p.ex_factory_usd ?? p.price;
      const numPrice = Number(rawPrice);
      const pPrice = (!isNaN(numPrice) && rawPrice !== null && rawPrice !== '') ? `$${numPrice.toFixed(2)} USD` : 'Pricing Not Set';

      const productId = p.product_id || p.id || '';
      const catalogLink = productId ? `/products?highlight=${productId}` : `/products`;
      const viewButtonText = isHindi ? "Catalog mein dekhein" : "View in Catalog";

      return `**${pName}**\n` +
      `- Brand: ${pBrand}\n` +
      `- Category: ${pCat}\n` +
      `- MOQ: ${pMoq}\n` +
      `- FOB Price: \`${pPrice}\`\n` +
      `[${viewButtonText}](${catalogLink})`;
    }).join('\n\n---\n\n');
  }

  try {
    return `Here is what I found in your records:\n\n\`\`\`json\n${JSON.stringify(data, null, 2)}\n\`\`\``;
  } catch {
    return String(data);
  }
}

async function executeDirectSqlTool(toolName: string, parsedInput: Record<string, any>, organizationId: string) {
  const supabase = getAdminSupabaseClient();
  
  if (!organizationId) {
    console.error('[Guru:Orchestrator] CRITICAL: Security violation - Missing organizationId.');
    return { error: 'Unauthorized workspace context.' };
  }

  try {
    if (toolName === 'search_leads') {
      const term = typeof parsedInput.search_term === 'string' ? parsedInput.search_term.trim().toLowerCase() : '';
      
      if (term.includes('total') || term.includes('how many') || term.includes('count') || term === '' || term.includes('lead') || term.includes('leads')) {
         const { count, error: countError } = await supabase.from('leads').select('*', { count: 'exact', head: true }).eq('organization_id', organizationId);
         const { data: recentLeads } = await supabase.from('leads').select('*').eq('organization_id', organizationId).limit(5);

         if (!countError) {
            return { message: `You have a total of ${count || 0} active leads in this workspace. Here are the recent ones:`, products: recentLeads || [] };
         }
      }

      const cleanTerm = term.replace(/details|info|search|lead|client|how many|total|leads/gi, '').trim();
      let query = supabase.from('leads').select('*').eq('organization_id', organizationId);
      
      if (cleanTerm) {
        query = query.or(`contact_name.ilike.%${cleanTerm}%,company_name.ilike.%${cleanTerm}%,email.ilike.%${cleanTerm}%`);
      }

      let { data, error } = await query.limit(5);
      if (error || !data || data.length === 0) {
        const { data: recentLeads } = await supabase.from('leads').select('*').eq('organization_id', organizationId).limit(5);
        if (recentLeads && recentLeads.length > 0) return { message: `Here are the latest CRM leads from your workspace:`, products: recentLeads };
        return { error: 'No matching leads found in this workspace.' };
      }
      return data;
    }

    if (toolName === 'search_catalog_and_pricing') {
      const term = typeof parsedInput.product_name === 'string' ? parsedInput.product_name.trim().toLowerCase() : '';
      
      // Clean query and extract ALL words (e.g. ['banana', 'chips'])
      const cleanTerm = term.replace(/price|cost|how much|details|kya/gi, '').trim();
      const searchWords = cleanTerm.split(/\s+/).filter(w => w.length > 1);

      let viewQuery = supabase.from('v_quote_eligible_products').select('*').eq('organization_id', organizationId);
        
      if (searchWords.length > 0) {
         viewQuery = viewQuery.ilike('product_name', `%${searchWords[0]}%`); // Broad search first
      }

      let { data: viewData, error: viewError } = await viewQuery.limit(20);

      if (!viewError && viewData && viewData.length > 0) {
        // STRICT EXACT MATCH: Item MUST contain ALL requested words.
        // If search is "banana chips", item must have "banana" AND "chips" (excludes "banana powder")
        const strictMatches = viewData.filter(item => {
           const name = (item.product_name || '').toLowerCase();
           return searchWords.every(word => name.includes(word));
        });

        if (strictMatches.length > 0) {
           return strictMatches;
        }
      }
      return { error: 'No matching products found.' };
    }

    return null;
  } catch (error: any) {
    console.error(`[Guru:Orchestrator] Database error for ${toolName}:`, error.message);
    return { error: 'Failed to retrieve records due to a database error.' };
  }
}

export async function runGuruAgenticQuery(
  question: string,
  organizationId: string,
  dbClient?: any,
): Promise<AgenticQueryResult> {
  const isHindi = isHindiQuery(question);

  const quickGreeting = getGreetingResponse(question);
  if (quickGreeting) {
    return { answer: quickGreeting, toolsUsed: [], ragUsed: false, citations: [] };
  }

  const lowerQ = question.toLowerCase();
  let forcedToolName: AgenticToolName | 'search_leads' | 'search_catalog_and_pricing' | null = null;
  let forcedInput: Record<string, any> = {};

  if (lowerQ.includes('lead') || lowerQ.includes('total leads') || lowerQ.includes('how many leads') || lowerQ.includes('client')) {
    forcedToolName = 'search_leads';
    forcedInput = { search_term: question };
  } else if (lowerQ.includes('price') || lowerQ.includes('catalog') || lowerQ.includes('moq') || lowerQ.includes('fob') || lowerQ.includes('chips') || lowerQ.includes('powder')) {
    forcedToolName = 'search_catalog_and_pricing';
    forcedInput = { product_name: question };
  }

  const toolsUsed: AgenticToolName[] = [];
  let ragUsed = false;
  let citations: Array<{ marker: string; sourceType: string; sourceId: string }> = [];
  let systemPrompt = SYSTEM_PROMPT;

  try {
    const embedResult = await embedChunks([question]);
    if (embedResult.ok && embedResult.embeddings && embedResult.embeddings.length > 0) {
      const ragResult = await retrieveGuru({
        organizationId,
        question,
        queryEmbedding: embedResult.embeddings[0],
        matchCount: 5,
        dbClient,
      });

      if (ragResult.found && ragResult.chunks && ragResult.chunks.length > 0) {
        ragUsed = true;
        citations = ragResult.chunks.map((c) => ({
          marker: c.citation,
          sourceType: c.source_type,
          sourceId: c.source_id,
        }));
        const formattedContext = ragResult.chunks.map(c => `[${c.citation}] ${c.content}`).join('\n\n');
        systemPrompt = `${SYSTEM_PROMPT}\n\nRetrieved Document Context:\n${formattedContext}`;
      }
    }
  } catch (err) {
    console.warn('[Guru:Orchestrator] RAG retrieval warning:', err);
  }

  const openai = getOpenAI();

  const openaiTools: OpenAI.Chat.ChatCompletionTool[] = [
    ...AGENTIC_TOOLS.map((t) => ({
      type: 'function' as const,
      function: {
        name: t.name,
        description: t.description,
        parameters: t.input_schema,
      },
    })),
    {
      type: 'function',
      function: {
        name: 'search_leads',
        description: 'Call this function whenever looking up customer leads, contact names, total leads, or company names.',
        parameters: {
          type: 'object',
          properties: { search_term: { type: 'string', description: 'Name, email, or company associated with the lead' } },
          required: ['search_term'],
        },
      },
    },
    {
      type: 'function',
      function: {
        name: 'search_catalog_and_pricing',
        description: 'Call this function whenever the user asks for product prices, costs, catalog items, FOB, or MOQ.',
        parameters: {
          type: 'object',
          properties: { product_name: { type: 'string', description: 'Product name or keyword' } },
          required: ['product_name'],
        },
      },
    }
  ];

  const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: question },
  ];

  let finalAnswer = "";
  let lastExecutedToolName = "";
  let structuredFormatApplied = false;
  let forcedToolDataFound = false;

  // 1. SQL DIRECT INTENT CHECK
  if (forcedToolName) {
    toolsUsed.push(forcedToolName as AgenticToolName);
    lastExecutedToolName = forcedToolName;
    const directResult = await executeDirectSqlTool(forcedToolName, forcedInput, organizationId);
    
    const listData = Array.isArray(directResult) ? directResult : (directResult?.products || []);
    
    if (listData && listData.length > 0) {
      // Data found in structured SQL Database
      finalAnswer = formatToolResultsToUI(forcedToolName, directResult, isHindi);
      structuredFormatApplied = true;
      forcedToolDataFound = true;
    } else {
      // SQL EMPTY: Seamlessly fallback to LLM (RAG / PDF reading)
      forcedToolName = null;
      toolsUsed.pop();
      messages.push({
         role: 'system',
         content: `System Event: The database search returned NO structured records for this query. You MUST now answer the user's question strictly by reading the 'Retrieved Document Context' (PDFs/Invoices) provided in the system prompt above.`
      });
    }
  }

  // 2. FALLBACK TO LLM (Runs for General Queries OR if SQL was empty)
  if (!forcedToolDataFound && !structuredFormatApplied) {
    for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
      const response = await openai.chat.completions.create({
        model: AGENTIC_MODEL,
        messages,
        tools: openaiTools,
        tool_choice: 'auto',
      });

      const choice = response.choices[0];
      if (!choice || !choice.message) break;

      const message = choice.message;

      if (!message.tool_calls || message.tool_calls.length === 0) {
        finalAnswer = message.content ? message.content.trim() : "";
        break; // LLM successfully read the RAG PDF and generated an answer!
      }

      messages.push(message);

      for (const toolCall of message.tool_calls) {
        if (toolCall.type !== 'function') continue;

        const toolName = toolCall.function.name;
        if (toolName) {
          toolsUsed.push(toolName as AgenticToolName);
          lastExecutedToolName = toolName;
        }

        let parsedInput: Record<string, any> = {};
        try { parsedInput = JSON.parse(toolCall.function.arguments || '{}'); } catch (parseError) {}

        let resultData: any;
        const directSqlResult = await executeDirectSqlTool(toolName, parsedInput, organizationId);

        if (directSqlResult) {
          resultData = directSqlResult;
        } else {
          const result = await callAgenticTool({ name: toolName as AgenticToolName, input: parsedInput }, organizationId, dbClient);
          resultData = result.ok ? result.data : { error: result.error };
        }

        messages.push({
          role: 'tool',
          tool_call_id: toolCall.id,
          content: JSON.stringify(resultData),
        });
      }
    }
  }

  // 3. UI FORMATTING (Only if an LLM tool returned SQL data)
  if (!structuredFormatApplied && toolsUsed.length > 0) {
    const lastToolMessage = messages.filter(m => m.role === 'tool').pop();
    const lastToolContent = lastToolMessage?.content;
    if (lastToolContent) {
      try {
        // Normalize content which may be a string or an array of parts (ChatCompletionContentPartText[])
        let rawContent: string;
        if (Array.isArray(lastToolContent)) {
          rawContent = lastToolContent.map((part: any) => (typeof part === 'string' ? part : (part?.text ?? ''))).join('');
        } else {
          rawContent = String(lastToolContent);
        }

        const parsed = JSON.parse(rawContent);
        if (parsed && !parsed.error && (Array.isArray(parsed) ? parsed.length > 0 : (parsed.products && parsed.products.length > 0))) {
           finalAnswer = formatToolResultsToUI(lastExecutedToolName, parsed, isHindi);
           structuredFormatApplied = true;
        }
      } catch {
        // ignore parse errors and continue
      }
    }
  }

  // 4. FINAL SAFETY CATCH
  if (!finalAnswer || finalAnswer === 'Data Not Found' || finalAnswer.toLowerCase().includes("couldn't find")) {
    finalAnswer = isHindi
      ? "Maaf kijiye, mujhe aapke active CRM records ya documents mein iski jankari nahi mili."
      : "I couldn't find any matching information in your active CRM records or guidelines.";
  }

  const filterResult = filterOutput(finalAnswer);
  if (!filterResult.safe) {
    finalAnswer = isHindi ? "Maaf kijiye, main is query par information share nahi kar sakta." : "I am unable to process or share information for this query.";
  }

  return { answer: finalAnswer, toolsUsed, ragUsed, citations };
}