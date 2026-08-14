/**
 * Module F — Golden Evaluation Dataset
 *
 * Curated query -> expected-answer pairs used to grade Setu Guru's
 * retrieval and grounding accuracy, and to catch regressions before they
 * reach production. Two case types:
 *
 *   - `type: 'rag'`     — the answer must come from retrieved document
 *                         chunks (src/lib/rag/retrieve.ts). Grading
 *                         should check both the answer content and that
 *                         citations ([R1], [R2], ...) are present and
 *                         correct.
 *   - `type: 'agentic'` — the answer must come from a live CRM query tool
 *                         (src/lib/rag/agentic-tools.ts), not from
 *                         document retrieval. Grading should check that
 *                         the expected tool was invoked and the answer
 *                         reflects that tool's live data.
 *
 * STATUS (updated 14-Aug-2026):
 *   - Wiring: AGENTIC_TOOLS + callAgenticTool() are now actually callable
 *     by Claude via src/lib/rag/guru-agentic-orchestrator.ts.
 *   - Grading script: scripts/golden-eval-runner.ts exists and can
 *     execute this dataset (see that file for how each case type is
 *     scored).
 *   - `rag-001` / `rag-002` are no longer PLACEHOLDER: no real UAE
 *     spice-export or HS-code document has been ingested yet, but a real
 *     ISO 9001:2015 Quality Management Systems document HAS been ingested
 *     (organization 823981b0-4566-44be-a94d-168dad153d78), so these two
 *     cases now test against that real document instead of sitting idle
 *     as placeholders. Swap in the original UAE spice-export / HS-code
 *     cases (or add new ones) once those specific documents are ingested.
 *   - `agentic-002`'s query is a template (`{{LEAD_NAME}}`) rather than a
 *     hardcoded name: the grading script resolves it against a real lead
 *     fetched live via get_leads at run time, so this case is genuinely
 *     gradable now without fabricating a name that may not exist in your
 *     seeded data.
 */

export type GoldenCaseType = 'rag' | 'agentic';

export interface GoldenCase {
  id: string;
  type: GoldenCaseType;
  /** The question exactly as a user might realistically type it. May
   *  contain `{{LEAD_NAME}}`, resolved by the grading script at run time
   *  against a real lead from this org's data. */
  query: string;
  /**
   * For `rag` cases: the expected answer content. Grading should use
   * semantic similarity or an LLM-as-judge comparison, not strict string
   * equality — paraphrased-but-correct answers should pass.
   * For `agentic` cases: a description of what the correct tool response
   * should contain.
   */
  expectedAnswer: string;
  /** For `agentic` cases, which tool(s) the model should invoke to answer correctly. */
  expectedTools?: AgenticToolNameForEval[];
  /** True if "Data Not Found" is the correct answer for this case (negative test). */
  expectNotFound?: boolean;
  /** True if this case has no real expected answer to grade against yet
   *  (e.g. no document has been ingested for it) — the grading script
   *  skips it visibly instead of scoring it. */
  isPlaceholder?: boolean;
  /** Free-text category for reporting, e.g. 'compliance', 'pipeline', 'hs-code'. */
  category: string;
}

/**
 * Mirrors AgenticToolName from agentic-tools.ts. Duplicated as a plain
 * string union (rather than imported) so this dataset has no import-time
 * dependency on the tools module and can be reviewed/edited standalone.
 */
type AgenticToolNameForEval =
  | 'get_leads'
  | 'get_lead_profile'
  | 'get_compliance_status'
  | 'get_pipeline_overview'
  | 'get_contracts'
  | 'get_tasks'
  | 'get_reports';

export const GOLDEN_DATASET: GoldenCase[] = [
  // --- RAG cases: rag-001/rag-002 now grade against the real ISO 9001
  // document ingested for org 823981b0-4566-44be-a94d-168dad153d78 ---
  {
    id: 'rag-001',
    type: 'rag',
    query: 'What ISO standard covers our quality management system?',
    expectedAnswer:
      'ISO 9001:2015 — Quality Management Systems - Requirements. The answer must cite the source document via [R1].',
    category: 'compliance',
  },
  {
    id: 'rag-002',
    type: 'rag',
    query: 'Do we have a quality management compliance document on file?',
    expectedAnswer:
      'Yes — an ISO 9001:2015 Quality Management Systems Requirements compliance document is on file, described as ensuring organizational quality standards. The answer must cite [R1].',
    category: 'compliance',
  },
  {
    id: 'rag-003',
    type: 'rag',
    query: 'What is the capital of France?',
    expectedAnswer:
      'Data Not Found - I could not find relevant information in the available documents.',
    expectNotFound: true,
    category: 'negative-test',
  },

  // --- Agentic cases: gradable now that guru-agentic-orchestrator.ts wires the tools in ---
  {
    id: 'agentic-001',
    type: 'agentic',
    query: 'How many leads do we have in the pipeline right now?',
    expectedAnswer: "Answer should reflect the live count from get_leads / get_pipeline_overview — not a document.",
    expectedTools: ['get_leads', 'get_pipeline_overview'],
    category: 'pipeline',
  },
  {
    id: 'agentic-002',
    type: 'agentic',
    query: 'What is the status of our contract with {{LEAD_NAME}}?',
    expectedAnswer:
      "Answer should reflect the live execution_state from get_contracts for that lead's contract, not a retrieved document.",
    expectedTools: ['get_contracts'],
    category: 'orders',
  },
  {
    id: 'agentic-003',
    type: 'agentic',
    query: 'What compliance items are outstanding across our leads?',
    expectedAnswer: 'Answer should reflect live data from get_compliance_status, not a static document.',
    expectedTools: ['get_compliance_status'],
    category: 'compliance',
  },
  {
    id: 'agentic-004',
    type: 'agentic',
    query: 'What tasks are overdue this week?',
    expectedAnswer: 'Answer should reflect live data from get_tasks, filtered to overdue items.',
    expectedTools: ['get_tasks'],
    category: 'tasks',
  },
];