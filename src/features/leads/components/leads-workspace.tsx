// SF-18-007C: Small public entrypoint.
// The production Leads workspace now routes through a non-legacy implementation
// module while list and command-center extraction continues in focused modules.
export * from "@/features/leads/components/workspace/leads-workspace-implementation";
