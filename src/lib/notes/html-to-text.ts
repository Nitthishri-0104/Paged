const BLOCK_TAG_PATTERN = /<\/(p|div|h[1-3]|li|blockquote|pre)>/gi;
const TAG_PATTERN = /<[^>]+>/g;
const ENTITY_MAP: Record<string, string> = {
  "&nbsp;": " ",
  "&amp;": "&",
  "&lt;": "<",
  "&gt;": ">",
  "&quot;": '"',
  "&#39;": "'",
};

/**
 * Strips the note editor's rich-text HTML down to plain text — used
 * anywhere HTML markup shouldn't leak through: the note list preview
 * snippet, and the text fed to AI tag suggestion / embeddings (which
 * should reason about the note's words, not its markup).
 */
export function htmlToText(html: string): string {
  return html
    .replace(BLOCK_TAG_PATTERN, "\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(TAG_PATTERN, "")
    .replace(/&[a-z0-9#]+;/gi, (entity) => ENTITY_MAP[entity.toLowerCase()] ?? entity)
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
