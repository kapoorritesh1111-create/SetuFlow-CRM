/**
 * SETU Flow internal organization id.
 * Pure constant (no imports) so it is safe to import from both client and
 * server components. Override per environment with INTERNAL_ORG_ID.
 */
export const INTERNAL_ORG_ID =
  process.env.INTERNAL_ORG_ID ?? '3327b9a7-aadb-44b0-9793-30c4045d3c92';
