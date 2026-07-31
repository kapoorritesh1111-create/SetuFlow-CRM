/**
 * src/lib/rag/vlm-parser.ts
 * Module A, Step 2 — VLM Document Parser
 *
 * Uses Claude's native PDF document input (no Apryse SDK, no image
 * rasterization step needed — the Anthropic Messages API accepts a PDF
 * directly as a base64 `document` content block). Matches the raw-fetch
 * convention already used in `src/lib/ai/provider.ts` rather than pulling
 * in `@anthropic-ai/sdk` for this call site.
 *
 * IMPORTANT CAVEAT ON CONFIDENCE SCORES:
 * The `confidence` value returned per page is the model's own self-reported
 * estimate (requested via the prompt below), not a calibrated statistical
 * confidence. It's a reasonable signal for "does this page look like it
 * extracted cleanly" (e.g. flags garbled tables, illegible scans) but
 * should not be treated as a precise probability. If tighter calibration
 * is needed later, that's a separate eval task (ties into Module F's
 * golden dataset — use it to check how well self-reported confidence
 * actually correlates with extraction correctness).
 */

/** A single page/section of extracted text, prior to chunking. Any parser
 *  implementation (VLM here, or Apryse if that path is ever revisited)
 *  must normalize its output to this shape — that's the entire
 *  integration surface between parsing and chunking. */
export interface ParsedPage {
  pageNumber: number;
  sectionTitle?: string;
  text: string;
  confidence: number;
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

/**
 * Parses a PDF via Claude Vision (native PDF document support) into
 * per-page structured text with self-reported confidence.
 *
 * Conforms to the `DocumentParser` shape expected by ingest.ts:
 * `(fileBuffer, mimeType) => Promise<ParsedPage[]>`.
 */
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
  };

  if (json.error?.message) {
    throw new Error(`VLM parse error: ${json.error.message}`);
  }

  const rawText = (json.content ?? [])
    .filter((block) => block.type === 'text')
    .map((block) => block.text ?? '')
    .join('\n')
    .trim();

  // Defensive: strip markdown code fences in case the model wraps the JSON
  // despite instructions not to (observed in practice with some responses).
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
  }));
}