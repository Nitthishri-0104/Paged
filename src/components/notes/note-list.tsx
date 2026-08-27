import type { NoteDTO, SearchMode } from "@/types/note";
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
  searchMode,
  onSearchModeChange,
  sort,
  onSortChange,
  isLoading,
  error,
  resolvedSearchMode,
}: {
  notes: NoteDTO[];
  selectedNoteId: string | null;
  onSelect: (id: string) => void;
  onCreateNote: () => void;
  isCreating: boolean;
  searchQuery: string;
  onSearchQueryChange: (value: string) => void;
  searchMode: SearchMode;
  onSearchModeChange: (mode: SearchMode) => void;
  sort: SortOption;
  onSortChange: (sort: SortOption) => void;
  isLoading: boolean;
  error: string | null;
  resolvedSearchMode: SearchMode | null;
}) {
  return (
    <section className="flex h-full w-80 shrink-0 flex-col border-r border-stone-200 bg-white" aria-label="Notes list">
      <div className="flex items-center justify-between p-4 pb-3">
        <div>
          <h1 className="text-lg font-bold text-stone-900">Your Notes</h1>
          <p className="text-xs text-stone-400">
            {notes.length} {notes.length === 1 ? "note" : "notes"}
          </p>
        </div>
        <button
          type="button"
          onClick={onCreateNote}
          disabled={isCreating}
          className="rounded-lg bg-amber-500 px-3 py-1.5 text-sm font-semibold text-white transition-colors hover:bg-amber-600 disabled:opacity-60"
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

      <div className="flex items-center justify-between gap-2 px-4 pb-3">
        <div role="tablist" aria-label="Search mode" className="flex rounded-lg bg-stone-100 p-0.5 text-sm">
          <button
            type="button"
            role="tab"
            aria-selected={searchMode === "substring"}
            onClick={() => onSearchModeChange("substring")}
            className={`rounded-md px-2.5 py-1 font-medium transition-colors ${
              searchMode === "substring" ? "bg-white text-stone-900 shadow-sm" : "text-stone-500"
            }`}
          >
            Words
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={searchMode === "semantic"}
            onClick={() => onSearchModeChange("semantic")}
            className={`rounded-md px-2.5 py-1 font-medium transition-colors ${
              searchMode === "semantic" ? "bg-white text-stone-900 shadow-sm" : "text-stone-500"
            }`}
          >
            Meaning
          </button>
        </div>

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

      {searchMode === "semantic" && searchQuery && resolvedSearchMode === "substring" && (
        <p className="mx-4 mb-3 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700">
          Semantic search isn&apos;t available right now, showing text matches instead.
        </p>
      )}

      <div className="flex-1 overflow-y-auto px-4 pb-4">
        {error && (
          <p role="alert" className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">
            {error}
          </p>
        )}
        {!error && isLoading && <p className="py-8 text-center text-sm text-stone-400">Loading…</p>}
        {!error && !isLoading && notes.length === 0 && (
          <p className="py-8 text-center text-sm text-stone-400">No notes match your filters yet.</p>
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
