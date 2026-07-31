/**
 * src/lib/rag/chunker.ts
 * Module A, Step 5 — Text Chunking (updated per Mayank, 13 Jul call)
 *
 * Changes from original 150-word spec:
 *   - Chunk size raised to 300-400 words (target ~350) to reduce
 *     fragmentation of regulatory clauses.
 *   - Per-chunk SHA-256 hash (not file-level) so ingest.ts can skip
 *     re-embedding chunks that didn't actually change on a document edit.
 *   - Parent section + neighbor chunk indices carried in metadata so
 *     retrieve.ts can pull adjacent context around a matched chunk.
 */

import { createHash } from 'crypto';
import type { ParsedPage } from './vlm-parser'; // ParsedPage is defined in vlm-parser.ts (the parser's output contract)

const MIN_CHUNK_WORDS = 300;
const MAX_CHUNK_WORDS = 400;
const TARGET_CHUNK_WORDS = 350;

export interface Chunk {
  chunkIndex: number;
  content: string;
  chunkHash: string;
  confidence: number;
  parentSection: string;
  prevChunkIndex: number | null;
  nextChunkIndex: number | null;
}

export function computeChunkHash(content: string): string {
  return createHash('sha256').update(content.trim()).digest('hex');
}

/**
 * Splits each page's text into ~350-word chunks (never exceeding 400).
 * When a page's remaining words wouldn't fill MIN_CHUNK_WORDS on their
 * own, they're still emitted as a final, shorter chunk for that page
 * (a page/section boundary is a more meaningful cut point than forcing
 * a merge across sections just to hit a word count).
 */
export function chunkPages(pages: ParsedPage[]): Chunk[] {
  const chunks: Chunk[] = [];

  for (const page of pages) {
    const words = page.text.trim().split(/\s+/).filter(Boolean);
    if (words.length === 0) continue;

    for (let i = 0; i < words.length; i += TARGET_CHUNK_WORDS) {
      const remaining = words.length - i;
      // If what's left after this chunk would be a tiny orphan chunk,
      // fold it into this one instead (bounded by MAX_CHUNK_WORDS) rather
      // than emitting a near-empty trailing chunk.
      const sliceEnd =
        remaining <= MAX_CHUNK_WORDS ? words.length : i + TARGET_CHUNK_WORDS;
      const slice = words.slice(i, Math.min(sliceEnd, i + MAX_CHUNK_WORDS)).join(' ');

      chunks.push({
        chunkIndex: chunks.length,
        content: slice,
        chunkHash: computeChunkHash(slice),
        confidence: page.confidence,
        parentSection: page.sectionTitle ?? `page_${page.pageNumber}`,
        prevChunkIndex: null,
        nextChunkIndex: null,
      });

      if (sliceEnd >= words.length) break; // consumed the rest of this page
    }
  }

  for (let i = 0; i < chunks.length; i++) {
    chunks[i].prevChunkIndex = i > 0 ? i - 1 : null;
    chunks[i].nextChunkIndex = i < chunks.length - 1 ? i + 1 : null;
  }

  return chunks;
}