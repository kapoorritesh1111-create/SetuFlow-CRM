/**
 * src/lib/rag/vlm-parser.ts
 * Module A, Step 2 — VLM Document Parser
 */

export interface ParsedPage {
  pageNumber: number;
  sectionTitle?: string;
  text: string;
  confidence: number;
  truncated?: boolean;
}

interface VlmExtractionResponse {
  pages: Array<{
    page_number: number;
    section_title?: string;
    text: string;
    confidence: number;
  }>;
}

const EXTRACTION_SYSTEM_PROMPT = `You are a document extraction engine for a trade-compliance RAG pipeline.
Extract all text from the provided document, page by page.

For each page, return:
- page_number (1-indexed)
- section_title: a short label for the section/heading this page falls under, if identifiable
- text: the full extracted text content of the page, preserving table structure as plain text where possible
- confidence: your own estimate (0.0-1.0) of how cleanly this page extracted — lower it for illegible scans, garbled tables, or ambiguous structure

Respond with ONLY a JSON object of the shape:
{"pages": [{"page_number": 1, "section_title": "...", "text": "...", "confidence": 0.9}, ...]}

No preamble, no markdown fencing, no explanation — JSON only.`;

export async function parseWithVlm(fileBuffer: Buffer, mimeType: string): Promise<ParsedPage[]> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY is not set');
  }

  if (mimeType !== 'application/pdf') {
    throw new Error(`parseWithVlm only supports application/pdf currently, got ${mimeType}`);
  }

  const base64Pdf = fileBuffer.toString('base64');

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-5',
      max_tokens: 8192,
      system: EXTRACTION_SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'document',
              source: { type: 'base64', media_type: 'application/pdf', data: base64Pdf },
            },
            { type: 'text', text: 'Extract this document per the instructions.' },
          ],
        },
      ],
    }),
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => response.statusText);
    throw new Error(`VLM parse request failed (${response.status}): ${errorText}`);
  }

  const json = (await response.json()) as {
    content?: Array<{ type: string; text?: string }>;
    error?: { message?: string };
    stop_reason?: string;
  };

  if (json.error?.message) {
    throw new Error(`VLM parse error: ${json.error.message}`);
  }

  // Issue #14 fix: detect truncation instead of silently accepting a cut-off response.
  const wasTruncated = json.stop_reason === 'max_tokens';
  if (wasTruncated) {
    console.warn('[VLM Parser] Response truncated — hit max_tokens (8192) ceiling. Flagging pages as truncated.');
  }

  const rawText = (json.content ?? [])
    .filter((block) => block.type === 'text')
    .map((block) => block.text ?? '')
    .join('\n')
    .trim();

  let cleanedText = rawText.trim();
  if (cleanedText.startsWith('```')) {
    cleanedText = cleanedText
      .replace(/^```(?:json)?\s*/i, '')
      .replace(/```\s*$/i, '')
      .trim();
  }

  let parsed: VlmExtractionResponse;
  try {
    parsed = JSON.parse(cleanedText);
  } catch {
    const snippet = rawText.slice(0, 300);
    if (wasTruncated) {
      throw new Error(
        `VLM response was truncated by the max_tokens ceiling, so the JSON is incomplete. Raw response started with: ${JSON.stringify(snippet)}`,
      );
    }
    throw new Error(
      `VLM response was not valid JSON — check prompt/model output format drift. Raw response started with: ${JSON.stringify(snippet)}`,
    );
  }

  if (!Array.isArray(parsed.pages)) {
    throw new Error('VLM response missing a "pages" array');
  }

  return parsed.pages.map((p) => ({
    pageNumber: p.page_number,
    sectionTitle: p.section_title,
    text: p.text,
    confidence: p.confidence,
    ...(wasTruncated ? { truncated: true } : {}),
  }));
}