// A fixed palette of accessible, distinguishable tag colors. Rather than
// storing a color on the Tag model (one more thing for a user to manage),
// each tag is deterministically assigned one by hashing its name — the
// same tag always renders the same color, with zero extra state.
// `dot` is a distinct literal so Tailwind's static scanner can pick it up —
// deriving it at runtime (e.g. `text.replace("text-", "bg-")`) would produce
// a class name that never appears verbatim in source, so Tailwind wouldn't
// generate CSS for it.
const PALETTE = [
  { bg: "bg-rose-100", text: "text-rose-800", dot: "bg-rose-500" },
  { bg: "bg-amber-100", text: "text-amber-800", dot: "bg-amber-500" },
  { bg: "bg-teal-100", text: "text-teal-800", dot: "bg-teal-500" },
  { bg: "bg-sky-100", text: "text-sky-800", dot: "bg-sky-500" },
  { bg: "bg-violet-100", text: "text-violet-800", dot: "bg-violet-500" },
  { bg: "bg-lime-100", text: "text-lime-800", dot: "bg-lime-500" },
  { bg: "bg-orange-100", text: "text-orange-800", dot: "bg-orange-500" },
  { bg: "bg-cyan-100", text: "text-cyan-800", dot: "bg-cyan-500" },
] as const;

export type TagColor = (typeof PALETTE)[number];

export function colorForTag(name: string): TagColor {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = (hash * 31 + name.charCodeAt(i)) | 0;
  }
  const index = Math.abs(hash) % PALETTE.length;
  return PALETTE[index];
}
