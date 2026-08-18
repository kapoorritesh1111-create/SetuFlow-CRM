/**
 * scripts/seed-products-ingest.ts
 * 
 * NOTE FOR CLIENT / REVIEWER:
 * -------------------------------------------------------------------------
 * Originally configured to use the Hugging Face BGE-M3 inference endpoint.
 * However, due to Hugging Face serverless billing limitations and insufficient
 * account credits, the BGE-M3 endpoint paused (returning 400 Bad Request: 
 * "The endpoint is paused"). 
 * 
 * As a temporary decision to bypass this billing block and successfully seed 
 * the vector database, this script has been routed to use OpenAI embeddings 
 * with explicit 1024 dimensions matching the database constraints.
 * -------------------------------------------------------------------------
 */

import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';
import fs from 'fs';
import path from 'path';

// Manually load .env.local
const envPath = path.resolve(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) {
  const envConfig = fs.readFileSync(envPath, 'utf8');
  envConfig.split('\n').forEach(line => {
    const parts = line.split('=');
    if (parts.length >= 2) {
      const key = parts[0].trim();
      const value = parts.slice(1).join('=').trim().replace(/^["']|["']$/g, '');
      if (key && !process.env[key]) {
        process.env[key] = value;
      }
    }
  });
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
const openAiApiKey = process.env.OPENAI_API_KEY;

if (!supabaseUrl || !supabaseServiceKey || !openAiApiKey) {
  console.error('[CRITICAL] Missing Supabase or OpenAI credentials in environment!');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);
const openai = new OpenAI({ apiKey: openAiApiKey });

async function runDirectOpenAIEmbedding() {
  console.log('[START] Fetching products from stg_product_resolved...');

  const { data: products, error } = await supabase
    .from('stg_product_resolved')
    .select('*');

  if (error) {
    console.error('[ERROR] Failed to fetch products:', error.message);
    return;
  }

  if (!products || products.length === 0) {
    console.log('[INFO] No products found.');
    return;
  }

  console.log(`[INFO] Processing and embedding ${products.length} products with 1024 dimensions...`);

  let successCount = 0;
  let failCount = 0;

  for (const [index, item] of products.entries()) {
    const sourceId = item.id;
    const organizationId = item.organization_id || '3327b9a7-aadb-44b0-9793-30c4045d3c92';
    const productName = item.productName || item.name || `Product-${index + 1}`;
    
    const productContent = `Product Name: ${productName}. Category: ${item.category || 'General'}. Description: ${item.description || 'No description available'}. Price: ${item.price ? `₹${item.price}` : 'N/A'}`;

    try {
      // Explicitly request 1024 dimensions to match database constraint
      const response = await openai.embeddings.create({
        model: "text-embedding-3-small",
        input: productContent,
        dimensions: 1024,
      });

      const vector = response.data[0].embedding;

      // Upsert into guru_embeddings
      const { error: upsertError } = await supabase
        .from('guru_embeddings')
        .upsert({
          organization_id: organizationId,
          source_type: 'product',
          source_id: sourceId,
          chunk_index: 0,
          content: productContent,
          embedding: vector,
          embedding_model: 'text-embedding-3-small',
          metadata: { product_name: productName }
        }, { onConflict: 'organization_id,source_type,source_id,chunk_index' });

      if (upsertError) {
        console.error(`[FAILED] Upsert failed for ${productName}:`, upsertError.message);
        failCount++;
      } else {
        console.log(`[SUCCESS] (${index + 1}/${products.length}) Embedded & Saved: ${productName}`);
        successCount++;
      }
    } catch (err: unknown) {
      console.error(`[EXCEPTION] ${productName}:`, err instanceof Error ? err.message : err);
      failCount++;
    }
  }

  console.log('----------------------------------------------------');
  console.log(`[COMPLETE] Processed: ${successCount} success, ${failCount} failed.`);
  console.log('----------------------------------------------------');
}

runDirectOpenAIEmbedding();