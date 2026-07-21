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
 * This file ships with placeholder `rag-*` entries because Module A/B
 * (ingestion + embeddings) have not run yet, so there are no real
 * documents to ground answers in. The `agentic-*` entries can be graded
 * as soon as Module F's tools are wired into the Guru response pipeline,
 * since they only depend on data already in this CRM's own tables.
 */

export type GoldenCaseType = 'rag' | 'agentic';

export interface GoldenCase {
  id: string;
  type: GoldenCaseType;
  /** The question exactly as a user might realistically type it. */
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
  // --- RAG cases: require real ingested documents (Module A/B) to be gradable ---
  {
    id: 'rag-001',
    type: 'rag',
    query: 'What compliance documents are required for exporting spices to UAE?',
    expectedAnswer:
      'PLACEHOLDER — replace once a real UAE spice-export compliance document has been ingested. The answer must cite the specific source via [R1]/[R2].',
    category: 'compliance',
  },
  {
    id: 'rag-002',
    type: 'rag',
    query: 'What is the HSN code for turmeric powder?',
    expectedAnswer: 'PLACEHOLDER — replace once an HS code reference document has been ingested.',
    category: 'hs-code',
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

  // --- Agentic cases: gradable as soon as Module F tools are wired ---
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
    query: 'What is the status of our contract with [seeded test lead name]?',
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

/**
 * TODO (Module F follow-up, tracked as tech debt — not blocking Module F
 * itself, which only needs the dataset and tools defined):
 *
 *   1. Once Module A/B ingestion has run against real compliance/HS-code
 *      documents, replace the `rag-*` placeholders with real expected
 *      answers and verify citations against the actual ingested source.
 *   2. Seed a known test lead + contract in TEST_ORG_A (see
 *      tests/security/guru-rag-tenant-isolation.test.ts for that org's
 *      id/credentials) and replace `[seeded test lead name]` in
 *      agentic-002 with the real, stable name/id.
 *   3. Build a grading script that runs each case through the full Guru
 *      pipeline (retrieve.ts for `rag` cases, agentic-tools.ts for
 *      `agentic` cases) and scores the result. That script is a separate
 *      deliverable from this dataset file.
 */