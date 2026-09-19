-- C4 Batch 6: remove anonymous execution from internal quote-number and document-term seed RPCs.
revoke execute on function public.generate_quote_number(uuid) from public, anon;
revoke execute on function public.seed_default_document_terms_profiles(uuid, text) from public, anon;
