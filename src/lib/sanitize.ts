/**
 * Input sanitization utilities for user-generated content.
 *
 * Provides defense-in-depth against XSS and injection attacks
 * by stripping HTML tags, limiting length, and normalizing whitespace
 * before data reaches the database.
 */

/**
 * Strip all HTML tags from a string.
 * Handles self-closing tags, comments, and common evasion patterns.
 */
export function stripHtmlTags(input: string): string {
  return input
    // Remove HTML comments
    .replace(/<!--[\s\S]*?-->/g, '')
    // Remove script/style blocks entirely
    .replace(/<(script|style)\b[^<]*(?:(?!<\/\1>)<[^<]*)*<\/\1>/gi, '')
    // Remove all HTML tags
    .replace(/<\/?[^>]+(>|$)/g, '')
    // Decode common HTML entities that could be used for evasion
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .replace(/&#x2F;/g, '/')
    // After decoding, strip any remaining tags
    .replace(/<\/?[^>]+(>|$)/g, '')
}

/**
 * Normalize whitespace: collapse multiple spaces/newlines, trim edges.
 * Preserves single newlines for multiline content (e.g., posts).
 */
export function normalizeWhitespace(input: string, options?: { preserveNewlines?: boolean }): string {
  let result = input
  if (options?.preserveNewlines) {
    // Collapse multiple blank lines into at most 2 newlines
    result = result.replace(/\n{3,}/g, '\n\n')
    // Collapse multiple spaces (but not newlines) into one
    result = result.replace(/[^\S\n]+/g, ' ')
  } else {
    // Collapse all whitespace into single spaces
    result = result.replace(/\s+/g, ' ')
  }
  return result.trim()
}

/**
 * Limit string length, cutting at word boundary when possible.
 */
export function limitLength(input: string, maxLength: number): string {
  if (input.length <= maxLength) return input
  // Try to cut at the last space before maxLength
  const truncated = input.slice(0, maxLength)
  const lastSpace = truncated.lastIndexOf(' ')
  if (lastSpace > maxLength * 0.8) {
    return truncated.slice(0, lastSpace)
  }
  return truncated
}

/**
 * Remove null bytes and other control characters that could cause issues.
 */
export function stripControlChars(input: string): string {
  // Remove null bytes and control chars except newline (\n), carriage return (\r), tab (\t)
  // eslint-disable-next-line no-control-regex
  return input.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
}

/**
 * Full sanitization pipeline for user text input.
 *
 * @param input - Raw user input
 * @param maxLength - Maximum allowed length (default: 2000)
 * @param options.preserveNewlines - Keep single newlines (for posts/descriptions)
 */
export function sanitizeUserInput(
  input: string,
  maxLength = 2000,
  options?: { preserveNewlines?: boolean }
): string {
  if (!input || typeof input !== 'string') return ''

  let result = input
  result = stripControlChars(result)
  result = stripHtmlTags(result)
  result = normalizeWhitespace(result, { preserveNewlines: options?.preserveNewlines })
  result = limitLength(result, maxLength)

  return result
}

/**
 * Sanitize a short single-line input (titles, names, etc.).
 * More restrictive: no newlines, shorter default max.
 */
export function sanitizeTitle(input: string, maxLength = 100): string {
  if (!input || typeof input !== 'string') return ''

  let result = input
  result = stripControlChars(result)
  result = stripHtmlTags(result)
  result = normalizeWhitespace(result) // no preserved newlines
  result = limitLength(result, maxLength)

  return result
}
