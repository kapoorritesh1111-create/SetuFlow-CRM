import {
  getLeadsPageData,
  getLeadProfileData,
  getComplianceWorkspaceData,
  getPipelineData,
  getContractsWorkspaceData,
  getTasksWorkspaceData,
  getReportsData,
} from '@/lib/queries/query-core';

/**
 * Module F — Agentic Tooling (read-only)
 *
 * Exposes a curated, read-only subset of src/lib/queries/query-core.ts
 * functions as Claude tool-use definitions, so Setu Guru can answer
 * questions grounded in live CRM data (leads, pipeline, compliance,
 * contracts, tasks, reports) rather than static RAG document context alone.
 *
 * GUARDRAILS (per engineering review, July 13 2026):
 *   - Every tool here is READ-ONLY. Nothing in this file writes, updates,
 *     deletes, or otherwise mutates a database record. Mutating actions
 *     stay on the existing human-approval path (see
 *     src/app/api/setu-guru/action/route.ts) — this file is intentionally
 *     separate from that and must stay that way.
 *   - `organizationId` is never taken from the model's tool-call
 *     arguments. It is injected server-side by the caller from the
 *     authenticated workspace (see `callAgenticTool`), so a
 *     prompt-injected or hallucinated tool call can never read another
 *     organization's data — this composes with the RLS/org-membership
 *     guarantees already enforced at the database layer (Module C).
 *   - This intentionally does NOT add any new real-time integration
 *     (e.g. live shipment/carrier tracking). SoW Section 3 keeps that
 *     out of scope. It only exposes data that already lives in this
 *     CRM's own database, through existing, already-audited query
 *     functions — not a new data source.
 */

export type AgenticToolName =
  | 'get_leads'
  | 'get_lead_profile'
  | 'get_compliance_status'
  | 'get_pipeline_overview'
  | 'get_contracts'
  | 'get_tasks'
  | 'get_reports';

/**
 * Anthropic Messages API tool-use definitions. Pass this array as `tools`
 * in the API call that powers Setu Guru's agentic responses.
 */
export const AGENTIC_TOOLS = [
  {
    name: 'get_leads',
    description:
      "Read-only. Returns the caller's organization's leads list (buyers and suppliers), including stage, owner, and follow-up status. Use for questions about lead volume, pipeline composition, or finding a specific lead by name.",
    input_schema: {
      type: 'object',
      properties: {},
      additionalProperties: false,
    },
  },
  {
    name: 'get_lead_profile',
    description:
      'Read-only. Returns full profile detail for a single lead by id, including activity history, product interests, and stage history. Use once a specific leadId is known (e.g. from get_leads).',
    input_schema: {
      type: 'object',
      properties: {
        leadId: { type: 'string', description: 'UUID of the lead to look up.' },
      },
      required: ['leadId'],
      additionalProperties: false,
    },
  },
  {
    name: 'get_compliance_status',
    description:
      'Read-only. Returns the organization\'s compliance workspace: outstanding compliance checklist items, document requirements, and their status per lead/market. Use for questions about what compliance documents are missing or required.',
    input_schema: {
      type: 'object',
      properties: {},
      additionalProperties: false,
    },
  },
  {
    name: 'get_pipeline_overview',
    description:
      "Read-only. Returns pipeline stage distribution and deal values across the organization's active pipelines. Use for questions about deal counts, stage bottlenecks, or pipeline value.",
    input_schema: {
      type: 'object',
      properties: {},
      additionalProperties: false,
    },
  },
  {
    name: 'get_contracts',
    description:
      'Read-only. Returns the organization\'s contracts workspace: contract status, execution state, and lifecycle dates. This is the closest tool to an "order status" lookup — it reads existing contract records already stored in this CRM, not a live external tracking feed. Use for questions about order/contract status.',
    input_schema: {
      type: 'object',
      properties: {},
      additionalProperties: false,
    },
  },
  {
    name: 'get_tasks',
    description:
      "Read-only. Returns the organization's task workspace: open tasks, due dates, and assignees. Use for questions about what work is outstanding.",
    input_schema: {
      type: 'object',
      properties: {},
      additionalProperties: false,
    },
  },
  {
    name: 'get_reports',
    description:
      'Read-only. Returns aggregate report data (exportable snapshots, summary metrics) for the organization. Use for high-level "how are we doing" questions rather than record-level detail.',
    input_schema: {
      type: 'object',
      properties: {},
      additionalProperties: false,
    },
  },
] as const;

export interface AgenticToolCall {
  name: AgenticToolName;
  input: Record<string, unknown>;
}

export interface AgenticToolResult {
  ok: boolean;
  toolName: AgenticToolName;
  data?: unknown;
  error?: string;
}

/**
 * Dispatches a single tool call to its corresponding read-only query
 * function, always scoped to `organizationId` — which must come from the
 * authenticated caller's workspace (e.g. `getWorkspaceAccess()`), never
 * from the model's tool-call input. This is the single choke point for
 * agentic tool execution: adding a new tool means adding both a case here
 * and a matching entry in `AGENTIC_TOOLS`, so the two can't silently drift
 * out of sync.
 *
 * OBSERVABILITY: every call is logged with tool name, organization,
 * outcome, and latency, so tool usage and failures can be traced and
 * measured (per engineering review, July 13 2026 — "no metrics, no
 * troubleshooting" without this). These are plain structured console
 * logs; wire them to whatever metrics/log pipeline the deployment uses.
 */
export async function callAgenticTool(
  call: AgenticToolCall,
  organizationId: string,
): Promise<AgenticToolResult> {
  const startedAt = Date.now();

  const logOutcome = (outcome: 'ok' | 'error', error?: string) => {
    const durationMs = Date.now() - startedAt;
    console.info('[Guru:agentic-tools] tool_call', {
      tool: call.name,
      organizationId,
      outcome,
      durationMs,
      ...(error ? { error } : {}),
    });
  };

  if (!organizationId) {
    logOutcome('error', 'Missing organizationId for tool call.');
    return { ok: false, toolName: call.name, error: 'Missing organizationId for tool call.' };
  }

  try {
    const result = await dispatchAgenticTool(call, organizationId);
    logOutcome(result.ok ? 'ok' : 'error', result.error);
    return result;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error executing tool.';
    console.error(`[Guru:agentic-tools] ${call.name} failed:`, error);
    logOutcome('error', message);
    return { ok: false, toolName: call.name, error: message };
  }
}

/** Internal dispatcher — separated from callAgenticTool so logging/timing wraps every path uniformly, including the exhaustiveness-check default case. */
async function dispatchAgenticTool(
  call: AgenticToolCall,
  organizationId: string,
): Promise<AgenticToolResult> {
  switch (call.name) {
      case 'get_leads': {
        const data = await getLeadsPageData(organizationId);
        return { ok: true, toolName: call.name, data };
      }
      case 'get_lead_profile': {
        const leadId = call.input?.leadId;
        if (typeof leadId !== 'string' || !leadId) {
          return { ok: false, toolName: call.name, error: 'leadId is required.' };
        }
        const data = await getLeadProfileData(organizationId, leadId);
        return { ok: true, toolName: call.name, data };
      }
      case 'get_compliance_status': {
        const data = await getComplianceWorkspaceData(organizationId);
        return { ok: true, toolName: call.name, data };
      }
      case 'get_pipeline_overview': {
        const data = await getPipelineData(organizationId);
        return { ok: true, toolName: call.name, data };
      }
      case 'get_contracts': {
        const data = await getContractsWorkspaceData(organizationId);
        return { ok: true, toolName: call.name, data };
      }
      case 'get_tasks': {
        const data = await getTasksWorkspaceData(organizationId);
        return { ok: true, toolName: call.name, data };
      }
      case 'get_reports': {
        const data = await getReportsData(organizationId);
        return { ok: true, toolName: call.name, data };
      }
      default: {
        // Exhaustiveness check: if a new AgenticToolName is added without
        // a matching case above, this line fails to compile.
        const exhaustiveCheck: never = call.name;
        return { ok: false, toolName: call.name, error: `Unknown tool: ${String(exhaustiveCheck)}` };
      }
    }
}