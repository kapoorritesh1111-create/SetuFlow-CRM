export type ImportIssueCategory =
  | 'validation_failure'
  | 'duplicate_conflict'
  | 'mapping_failure'
  | 'normalization_failure';

export type ImportIssuePayload = {
  category: ImportIssueCategory;
  categoryLabel: string;
  code: string;
  label: string;
  message: string;
  blocking: boolean;
};

const IMPORT_ISSUE_CATEGORY_LABELS: Record<ImportIssueCategory, string> = {
  validation_failure: 'Validation failure',
  duplicate_conflict: 'Duplicate conflict',
  mapping_failure: 'Mapping failure',
  normalization_failure: 'Normalization failure',
};

export class ImportIssueError extends Error {
  readonly issue: ImportIssuePayload;

  constructor(issue: ImportIssuePayload) {
    super(issue.message);
    this.name = 'ImportIssueError';
    this.issue = issue;
  }
}

export function createImportIssuePayload(
  category: ImportIssueCategory,
  code: string,
  label: string,
  message: string,
): ImportIssuePayload {
  return {
    category,
    categoryLabel: IMPORT_ISSUE_CATEGORY_LABELS[category],
    code,
    label,
    message,
    blocking: true,
  };
}

export function createImportIssueError(
  category: ImportIssueCategory,
  code: string,
  label: string,
  message: string,
) {
  return new ImportIssueError(createImportIssuePayload(category, code, label, message));
}

export function isImportIssueError(error: unknown): error is ImportIssueError {
  return error instanceof ImportIssueError;
}

export function getImportIssuePayload(error: unknown): ImportIssuePayload | null {
  return isImportIssueError(error) ? error.issue : null;
}
