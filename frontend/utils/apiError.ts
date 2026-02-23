/**
 * Extract a human-readable error message from an Axios error.
 * Handles: API error responses, network failures, timeout, server errors.
 */
export function getApiError(
  error: unknown,
  fallback = 'Something went wrong. Please try again.'
): string {
  if (!error || typeof error !== 'object') return fallback

  const e = error as Record<string, any>

  // Timeout
  if (e?.code === 'ECONNABORTED' || e?.code === 'ERR_CANCELED') {
    return 'Request timed out. Please try again.'
  }

  // No network / server unreachable
  if (e?.code === 'ERR_NETWORK' || e?.code === 'ECONNREFUSED' || e?.message === 'Network Error') {
    return 'Cannot reach the server. Check your internet connection.'
  }

  const data = e?.response?.data

  // Prefer the API's message field
  if (data?.message && typeof data.message === 'string') {
    return data.message
  }

  // Fall back to first validation error in the errors array
  if (Array.isArray(data?.errors) && data.errors.length > 0) {
    const first = data.errors[0]
    return typeof first === 'string' ? first : first?.message ?? fallback
  }

  // HTTP status-level fallbacks
  const status: number | undefined = e?.response?.status
  if (status === 429) return 'Too many requests. Please slow down and try again.'
  if (status === 503) return 'Server is temporarily unavailable. Try again shortly.'
  if (status && status >= 500) return 'A server error occurred. Please try again later.'

  // Generic JS error message
  if (e?.message && typeof e.message === 'string') return e.message

  return fallback
}
