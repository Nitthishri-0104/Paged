import type { NoteDTO } from "@/types/note";
import { NoteCard } from "@/components/notes/note-card";
import { DateFilterPopover } from "@/components/notes/date-filter-popover";
import type { SortOption } from "@/lib/validation/notes";
import { formatDateFilterLabel, type AppliedDateFilter } from "@/lib/notes/date-ranges";

export function NoteList({
  notes,
  selectedNoteId,
  onSelect,
  onCreateNote,
  isCreating,
  searchQuery,
  onSearchQueryChange,
  dateFilter,
  onApplyDateFilter,
  onClearDateFilter,
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
  dateFilter: AppliedDateFilter | null;
  onApplyDateFilter: (filter: AppliedDateFilter) => void;
  onClearDateFilter: () => void;
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
        <div className="flex items-center gap-2">
          <label htmlFor="note-search" className="sr-only">
            Search your notes
          </label>
          <input
            id="note-search"
            type="search"
            placeholder="Search your notes…"
            value={searchQuery}
            onChange={(event) => onSearchQueryChange(event.target.value)}
            className="block w-full flex-1 rounded-lg border border-stone-300 px-3 py-2 text-sm shadow-sm focus-visible:border-teal-600"
          />
          <DateFilterPopover value={dateFilter} onApply={onApplyDateFilter} onClear={onClearDateFilter} />
        </div>

        {dateFilter && (
          <div className="mt-2 flex items-center gap-1.5">
            <span className="inline-flex items-center gap-1 rounded-full bg-teal-50 px-2.5 py-0.5 text-xs font-medium text-teal-800">
              <CalendarIcon />
              {formatDateFilterLabel(dateFilter.preset, dateFilter.range)}
            </span>
            <button
              type="button"
              onClick={onClearDateFilter}
              aria-label="Clear date filter"
              className="rounded-full p-0.5 text-teal-700 hover:bg-teal-100"
            >
              <RemoveIcon />
            </button>
          </div>
        )}
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

function CalendarIcon() {
  return (
    <svg viewBox="0 0 20 20" aria-hidden className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth={1.5}>
      <rect x="3" y="4" width="14" height="13" rx="1.5" />
      <path d="M3 8h14M7 2.5v3M13 2.5v3" strokeLinecap="round" />
    </svg>
  );
}

function RemoveIcon() {
  return (
    <svg viewBox="0 0 12 12" aria-hidden className="h-2.5 w-2.5" fill="none" stroke="currentColor" strokeWidth={1.5}>
      <path d="M2 2l8 8M10 2l-8 8" strokeLinecap="round" />
    </svg>
  );
}
