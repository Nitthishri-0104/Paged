import type { NoteDTO } from "@/types/note";
import { NoteCard } from "@/components/notes/note-card";
import type { SortOption } from "@/lib/validation/notes";

export function NoteList({
  notes,
  selectedNoteId,
  onSelect,
  onCreateNote,
  isCreating,
  searchQuery,
  onSearchQueryChange,
  sort,
  onSortChange,
  isLoading,
  error,
}: {
  notes: NoteDTO[];
  selectedNoteId: string | null;
  onSelect: (id: string) => void;
  onCreateNote: () => void;
  isCreating: boolean;
  searchQuery: string;
  onSearchQueryChange: (value: string) => void;
  sort: SortOption;
  onSortChange: (sort: SortOption) => void;
  isLoading: boolean;
  error: string | null;
}) {
  return (
    <section className="flex h-full w-80 shrink-0 flex-col border-r border-stone-200 bg-white" aria-label="Notes list">
      <div className="flex items-center justify-between p-4 pb-3">
        <div>
          <h1 className="text-lg font-bold text-stone-900">Your Notes</h1>
          <p className="text-xs text-stone-500">
            {notes.length} {notes.length === 1 ? "note" : "notes"}
          </p>
        </div>
        <button
          type="button"
          onClick={onCreateNote}
          disabled={isCreating}
          className="rounded-lg bg-amber-500 px-3 py-1.5 text-sm font-semibold text-stone-900 transition-colors hover:bg-amber-600 disabled:opacity-60"
        >
          + New Note
        </button>
      </div>

      <div className="px-4 pb-3">
        <label htmlFor="note-search" className="sr-only">
          Search your notes
        </label>
        <input
          id="note-search"
          type="search"
          placeholder="Search your notes…"
          value={searchQuery}
          onChange={(event) => onSearchQueryChange(event.target.value)}
          className="block w-full rounded-lg border border-stone-300 px-3 py-2 text-sm shadow-sm focus-visible:border-teal-600"
        />
      </div>

      <div className="flex items-center justify-end gap-2 px-4 pb-3">
        <label className="flex items-center gap-1 text-xs text-stone-500">
          <span className="sr-only">Sort by</span>
          <select
            value={sort}
            onChange={(event) => onSortChange(event.target.value as SortOption)}
            className="rounded-md border border-stone-200 bg-white px-1.5 py-1 text-xs"
          >
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
          </select>
        </label>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-4">
        {error && (
          <p role="alert" className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">
            {error}
          </p>
        )}
        {!error && isLoading && <p className="py-8 text-center text-sm text-stone-500">Loading…</p>}
        {!error && !isLoading && notes.length === 0 && (
          <p className="py-8 text-center text-sm text-stone-500">No notes match your filters yet.</p>
        )}
        {!error && !isLoading && notes.length > 0 && (
          <ul className="space-y-2">
            {notes.map((note) => (
              <NoteCard
                key={note.id}
                note={note}
                isSelected={note.id === selectedNoteId}
                onSelect={() => onSelect(note.id)}
              />
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
