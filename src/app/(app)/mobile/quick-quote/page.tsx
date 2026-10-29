// Render the canonical, authenticated Quick Quote workbench at the mobile URL.
// Reusing the server page preserves org-specific service families, pricing engines,
// quantity rules, basket/draft persistence and formal quotation approval guards.
// It also avoids a redirect round-trip inside the installable PWA.
export { default } from '@/app/(app)/quick-quote/page';
