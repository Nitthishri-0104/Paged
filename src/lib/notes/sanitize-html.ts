import "server-only";
import sanitizeHtml from "sanitize-html";

// Mirrors exactly what the TipTap editor's schema (StarterKit + Link) can
// produce. Anything outside this allowlist — <script>, event handler
// attributes, arbitrary styles — is stripped here, before it ever reaches
// the database, rather than trusted to whatever sanitization the editor
// happens to do on the client. A request straight to the API (bypassing
// the browser editor entirely) still can't smuggle in unsafe markup.
const ALLOWED_TAGS = [
  "p",
  "br",
  "strong",
  "b",
  "em",
  "i",
  "s",
  "u",
  "h1",
  "h2",
  "h3",
  "ul",
  "ol",
  "li",
  "blockquote",
  "code",
  "pre",
  "a",
];

/** Sanitizes note body HTML before it's persisted. Plain text passes through unchanged. */
export function sanitizeNoteHtml(html: string): string {
  return sanitizeHtml(html, {
    allowedTags: ALLOWED_TAGS,
    allowedAttributes: {
      a: ["href", "rel", "target"],
    },
    // Only allow safe URL schemes on links — no `javascript:`.
    allowedSchemes: ["http", "https", "mailto"],
    transformTags: {
      a: sanitizeHtml.simpleTransform("a", { rel: "noopener noreferrer", target: "_blank" }),
    },
  });
}
