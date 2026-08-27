import { colorForTag } from "@/lib/notes/tag-colors";

export function TagPill({
  name,
  onRemove,
  removeLabel,
}: {
  name: string;
  onRemove?: () => void;
  removeLabel?: string;
}) {
  const color = colorForTag(name);
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${color.bg} ${color.text}`}
    >
      {name}
      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          aria-label={removeLabel ?? `Remove tag ${name}`}
          className="rounded-full p-0.5 hover:bg-black/10 focus-visible:bg-black/10"
        >
          <svg
            viewBox="0 0 12 12"
            aria-hidden
            className="h-2.5 w-2.5"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.5}
          >
            <path d="M2 2l8 8M10 2l-8 8" strokeLinecap="round" />
          </svg>
        </button>
      )}
    </span>
  );
}
