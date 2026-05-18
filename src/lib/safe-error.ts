const TECHNICAL_ERROR_PATTERNS = [
  /duplicate key/i,
  /violates? .*constraint/i,
  /foreign key/i,
  /not-null constraint/i,
  /null value in column/i,
  /schema cache/i,
  /could not find the function/i,
  /relation .* does not exist/i,
  /column .* does not exist/i,
  /invalid input syntax/i,
  /permission denied/i,
  /row-level security/i,
  /PGRST\d+/i,
  /SQLSTATE/i,
  /PostgREST/i,
  /Supabase/i,
  /stack trace/i,
]

export function getRawErrorMessage(error: unknown) {
  if (!error) return ''
  if (typeof error === 'string') return error
  if (error instanceof Error) return error.message
  if (typeof error === 'object' && error && 'message' in error) return String((error as { message?: unknown }).message ?? '')
  return String(error)
}

export function isTechnicalErrorMessage(message: string) {
  return TECHNICAL_ERROR_PATTERNS.some((pattern) => pattern.test(message))
}

export function safeUserError(error: unknown, fallback = 'Something went wrong. Please try again or refresh the workspace.') {
  const message = getRawErrorMessage(error).trim()
  if (!message) return fallback
  if (isTechnicalErrorMessage(message)) return fallback
  if (message.length > 220) return fallback
  return message
}

export function safeApiError(error: unknown, fallback = 'Request failed. Please try again.') {
  return { error: safeUserError(error, fallback) }
}

export function logServerError(scope: string, error: unknown) {
  const message = getRawErrorMessage(error)
  if (message) console.error(`[${scope}]`, message)
  else console.error(`[${scope}]`, error)
}
