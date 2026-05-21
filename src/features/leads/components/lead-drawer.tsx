// SF-18-007: Small public entrypoint.
// The implementation was moved to a focused submodule so this canonical import path
// stays stable while the large legacy implementation is decomposed in smaller PRs.
export * from "@/features/leads/components/drawer/lead-drawer.legacy";
