-- S32-SMC-004 — Retire orphaned smc_chat_messages
-- APPLIED LIVE on 2026-06-19. This file is the repo record of that change.
-- The table was unreferenced anywhere in src; SMC chat runs on the unified chat_* engine.
-- The 3 rows that existed (all internal test content) are archived below for the record.
--
-- archived rows (channel | sender | content):
--   general | SMC User      | "Post a status update"
--   general | SMC User      | "Ask about an issue"
--   dm      | Ritesh Kapoor | "Share a deployment note Trying something new"

DROP TABLE IF EXISTS public.smc_chat_messages CASCADE;
