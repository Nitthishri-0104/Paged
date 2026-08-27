// A fixed palette of accessible, distinguishable tag colors, keyed by name
// so a color choice can be persisted on the Tag model (`color`) instead of
// derived from the tag's name — letting two users, or two tags with similar
// names, pick genuinely different colors on purpose.
//
// `dot`/`swatch` are distinct literals (not built from `bg`/`text` via
// string replacement) so Tailwind's static scanner can find them — a class
// name assembled at runtime never appears verbatim in source, so Tailwind
// wouldn't generate CSS for it.
export const TAG_COLOR_PRESETS = [
  { key: "blue", label: "Blue", swatch: "bg-blue-500", bg: "bg-blue-100", text: "text-blue-800", dot: "bg-blue-500" },
  {
    key: "orange",
    label: "Orange",
    swatch: "bg-orange-500",
    bg: "bg-orange-100",
    text: "text-orange-800",
    dot: "bg-orange-500",
  },
  { key: "teal", label: "Teal", swatch: "bg-teal-500", bg: "bg-teal-100", text: "text-teal-800", dot: "bg-teal-500" },
  {
    key: "green",
    label: "Green",
    swatch: "bg-emerald-500",
    bg: "bg-emerald-100",
    text: "text-emerald-800",
    dot: "bg-emerald-500",
  },
  { key: "pink", label: "Pink", swatch: "bg-rose-500", bg: "bg-rose-100", text: "text-rose-800", dot: "bg-rose-500" },
  {
    key: "purple",
    label: "Purple",
    swatch: "bg-violet-500",
    bg: "bg-violet-100",
    text: "text-violet-800",
    dot: "bg-violet-500",
  },
  {
    key: "brown",
    label: "Brown",
    swatch: "bg-[#8b5e3c]",
    bg: "bg-[#8b5e3c]/10",
    text: "text-[#6b4423]",
    dot: "bg-[#8b5e3c]",
  },
] as const;

export type TagColorKey = (typeof TAG_COLOR_PRESETS)[number]["key"];
export type TagColor = (typeof TAG_COLOR_PRESETS)[number];

export const DEFAULT_TAG_COLOR_KEY: TagColorKey = "blue";

const PRESETS_BY_KEY = new Map<string, TagColor>(TAG_COLOR_PRESETS.map((preset) => [preset.key, preset]));

export function isTagColorKey(value: string): value is TagColorKey {
  return PRESETS_BY_KEY.has(value);
}

/** Looks up a persisted color key; falls back to a deterministic hash of the name for anything unrecognized. */
export function colorForTag(name: string, colorKey?: string | null): TagColor {
  if (colorKey) {
    const preset = PRESETS_BY_KEY.get(colorKey);
    if (preset) return preset;
  }
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = (hash * 31 + name.charCodeAt(i)) | 0;
  }
  const index = Math.abs(hash) % TAG_COLOR_PRESETS.length;
  return TAG_COLOR_PRESETS[index];
}
