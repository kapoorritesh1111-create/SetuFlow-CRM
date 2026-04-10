# API Build Preparation

Use this mitigation pack when you later introduce REST or RPC-backed API endpoints.

## Recommended sequence

1. rotate secrets
2. apply additive SQL in order
3. verify RLS in staging
4. point server actions or API routes to audited RPCs
5. add request IDs and error capture

## Why RPC for leads

Your original repo handled lead writes across multiple tables in application code. RPC is safer because it keeps the multi-table mutation in one transaction.
