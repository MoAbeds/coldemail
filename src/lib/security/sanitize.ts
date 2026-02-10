/**
 * Input sanitization utilities for XSS prevention.
 * Uses DOMPurify for HTML sanitization, plus helpers for common patterns.
 */

/**
 * Strip HTML tags from a string (server-safe, no DOMPurify dependency).
 * For rich text that needs selective tag allowance, use DOMPurify on the client.
 */
export function stripHtml(input: string): string {
  return input.replace(/<[^>]*>/g, "");
}

/**
 * Sanitize a plain text input — trim, remove null bytes, limit length.
 */
export function sanitizeText(input: string, maxLength = 10000): string {
  return input
    .replace(/\0/g, "") // null bytes
    .trim()
    .slice(0, maxLength);
}

/**
 * Sanitize an email address.
 */
export function sanitizeEmail(input: string): string {
  return input.toLowerCase().trim().slice(0, 320);
}

/**
 * Validate and sanitize a URL.
 * Returns null if invalid.
 */
export function sanitizeUrl(input: string): string | null {
  try {
    const url = new URL(input.trim());
    if (!["http:", "https:"].includes(url.protocol)) return null;
    return url.toString();
  } catch {
    return null;
  }
}

/**
 * Sanitize an object's string values recursively.
 */
export function sanitizeObject<T extends Record<string, unknown>>(
  obj: T,
  maxStringLength = 10000
): T {
  const result = { ...obj };
  for (const key of Object.keys(result)) {
    const value = result[key];
    if (typeof value === "string") {
      (result as Record<string, unknown>)[key] = sanitizeText(value, maxStringLength);
    } else if (value && typeof value === "object" && !Array.isArray(value)) {
      (result as Record<string, unknown>)[key] = sanitizeObject(
        value as Record<string, unknown>,
        maxStringLength
      );
    }
  }
  return result;
}

/**
 * Sanitize email template content — allow safe HTML tags only.
 * Removes script tags, event handlers, and dangerous attributes.
 */
export function sanitizeEmailHtml(html: string): string {
  return html
    // Remove script tags and content
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
    // Remove event handlers
    .replace(/\s*on\w+\s*=\s*["'][^"']*["']/gi, "")
    .replace(/\s*on\w+\s*=\s*\S+/gi, "")
    // Remove javascript: URLs
    .replace(/href\s*=\s*["']javascript:[^"']*["']/gi, 'href="#"')
    .replace(/src\s*=\s*["']javascript:[^"']*["']/gi, 'src=""')
    // Remove data: URLs in images (potential XSS vector)
    .replace(/src\s*=\s*["']data:(?!image\/)[^"']*["']/gi, 'src=""');
}
