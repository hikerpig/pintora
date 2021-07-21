/**
 * Encode string to share in url.
 * Used in docs.
 */
export function encodeForUrl(code: string) {
  const encoded = encodeURIComponent(btoa(escape(code)))
  return encoded
}

/**
 * Decode the code part in url.
 * Used in live-editor and other demo pages.
 */
export function decodeCodeInUrl(input: string) {
  return unescape(atob(decodeURIComponent(input)))
}
