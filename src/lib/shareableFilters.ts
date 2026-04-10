/*
 * Shareable filter utilities.
 *
 * Shareable filters allow a user to capture their current filter
 * configuration and encode it into a compact string suitable for
 * inclusion in URLs or copy/paste. This enables lightweight sharing
 * of filter presets without requiring backend persistence. When the
 * encoded string is present in the query parameters the receiving
 * screen can decode it and apply the same filter model. The encoding
 * uses base64 over the JSON representation of the filter object.
 */

/**
 * Encode an arbitrary filter model into a base64 string. This helper
 * uses URI‑safe encoding to avoid issues with special characters in
 * query parameters. If the input cannot be serialized, an empty
 * string is returned.
 *
 * @param model The filter model to encode.
 * @returns A base64 encoded representation of the filter model.
 */
export function encodeFilterModel(model: unknown): string {
  try {
    const json = JSON.stringify(model ?? {});
    // Use encodeURIComponent and unescape to ensure proper UTF‑8 handling.
    return typeof btoa === 'function' ? btoa(unescape(encodeURIComponent(json))) : '';
  } catch {
    return '';
  }
}

/**
 * Decode a previously encoded filter model. If decoding fails or the
 * payload cannot be parsed as JSON, null is returned. Consumers
 * should handle null by falling back to a default filter model.
 *
 * @param token The base64 encoded filter model.
 * @returns The decoded filter model or null if decoding fails.
 */
export function decodeFilterModel<T = any>(token: string | null | undefined): T | null {
  if (!token) return null;
  try {
    const json = decodeURIComponent(escape(atob(token)));
    return JSON.parse(json) as T;
  } catch {
    return null;
  }
}

/**
 * Normalize a raw filter model to a predictable shape. This helper
 * exists as a placeholder for more sophisticated filter validation
 * that may be needed as the application evolves. For now it simply
 * returns the model as‑is.
 */
export function normalizeFilterModel<T>(model: T): T {
  return model;
}