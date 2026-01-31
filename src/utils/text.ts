/**
 * Decode HTML entities in a string using the browser's built-in decoder.
 * Handles entities like &rsquo;, &hellip;, &mdash;, etc.
 */
export function decodeHtmlEntities(text: string): string {
  if (!text) return '';
  const textarea = document.createElement('textarea');
  textarea.innerHTML = text;
  return textarea.value;
}

/**
 * Strip HTML tags and decode entities from a string.
 * Converts <br> to newlines and removes all other tags.
 */
export function stripHtml(html: string): string {
  if (!html) return '';

  // Convert <br> tags to newlines
  let text = html.replace(/<br\s*\/?>/gi, '\n');

  // Remove all other HTML tags
  text = text.replace(/<[^>]*>/g, '');

  // Decode HTML entities using browser's built-in decoder
  text = decodeHtmlEntities(text);

  return text.trim();
}
