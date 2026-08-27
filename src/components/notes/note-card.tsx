import type { NoteDTO } from "@/types/note";
import { formatRelativeTime } from "@/lib/format";
import { htmlToText } from "@/lib/notes/html-to-text";
import { TagPill } from "@/components/notes/tag-pill";

export function NoteCard({ note, isSelected, onSelect }: { note: NoteDTO; isSelected: boolean; onSelect: () => void }) {
  const preview = htmlToText(note.body).slice(0, 140);

  return (
    <li>
      <button
        type="button"
        onClick={onSelect}
        aria-current={isSelected ? "true" : undefined}
        className={`w-full rounded-xl border p-4 text-left transition-colors ${
          isSelected
            ? "border-teal-700 bg-teal-700 text-white shadow-sm"
            : "border-stone-200 bg-white hover:border-teal-300"
        }`}
      >
        <div className="flex items-start justify-between gap-2">
          <h3 className={`truncate text-sm font-semibold ${isSelected ? "text-white" : "text-stone-900"}`}>
            {note.title || "Untitled note"}
          </h3>
          {note.favorite && (
            <svg
              viewBox="0 0 20 20"
              aria-label="Favorite"
              className={`h-4 w-4 shrink-0 ${isSelected ? "text-white" : "text-amber-500"}`}
              fill="currentColor"
            >
              <path d="M10 17.25s-6.5-4.06-8.5-8.06C.36 6.66 2 3.75 5 3.75c1.7 0 3.15 1 4 2.25.85-1.25 2.3-2.25 4-2.25 3 0 4.64 2.91 3.5 5.44-2 4-8.5 8.06-8.5 8.06Z" />
            </svg>
          )}
        </div>
        {preview && (
          <p className={`mt-1 line-clamp-2 text-sm ${isSelected ? "text-teal-50" : "text-stone-500"}`}>{preview}</p>
        )}
        {note.tags.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {note.tags.slice(0, 3).map((tag) => (
              <TagPill key={tag.id} name={tag.name} color={tag.color} />
            ))}
            {note.tags.length > 3 && (
              <span className={`text-xs ${isSelected ? "text-teal-100" : "text-stone-400"}`}>
                +{note.tags.length - 3}
              </span>
            )}
          </div>
        )}
        <p className={`mt-2 text-xs ${isSelected ? "text-teal-100" : "text-stone-400"}`}>
          {formatRelativeTime(note.createdAt)}
        </p>
      </button>
    </li>
  );
}
