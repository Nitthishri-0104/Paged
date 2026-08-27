"use client";

import { useState, type KeyboardEvent } from "react";
import type { NoteDTO, TagDTO } from "@/types/note";
import { formatRelativeTime } from "@/lib/format";
import { TagPill } from "@/components/notes/tag-pill";
import { RichTextEditor } from "@/components/notes/rich-text-editor";

export type SaveStatus = "idle" | "saving" | "saved" | "error";

export function NoteEditor({
  note,
  allTags,
  saveStatus,
  onEdit,
  onToggleFavorite,
  onDelete,
  onAddTag,
  onRemoveTag,
  aiSuggestions,
  isFetchingSuggestions,
  onFetchSuggestions,
  onAcceptSuggestion,
  onDismissSuggestion,
}: {
  note: NoteDTO | null;
  allTags: TagDTO[];
  saveStatus: SaveStatus;
  onEdit: (patch: { title?: string; body?: string }) => void;
  onToggleFavorite: () => void;
  onDelete: () => void;
  onAddTag: (name: string) => void;
  onRemoveTag: (tagId: string) => void;
  aiSuggestions: string[];
  isFetchingSuggestions: boolean;
  onFetchSuggestions: () => void;
  onAcceptSuggestion: (name: string) => void;
  onDismissSuggestion: (name: string) => void;
}) {
  const [tagDraft, setTagDraft] = useState("");

  // Clear the in-progress "add tag" text when the selected note changes.
  // Adjusting state during render (rather than in a `useEffect`) is React's
  // recommended pattern for "reset state when a prop changes" — it avoids
  // an extra commit-then-effect render pass.
  const [renderedNoteId, setRenderedNoteId] = useState(note?.id);
  if (note?.id !== renderedNoteId) {
    setRenderedNoteId(note?.id);
    setTagDraft("");
  }

  if (!note) {
    return (
      <section className="flex flex-1 items-center justify-center text-stone-400" aria-label="Note editor">
        <p>Select a note, or create a new one to get started.</p>
      </section>
    );
  }

  function submitTag() {
    const name = tagDraft.trim();
    if (!name) return;
    onAddTag(name);
    setTagDraft("");
  }

  function handleTagKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter") {
      event.preventDefault();
      submitTag();
    }
  }

  const existingTagNames = new Set(note.tags.map((tag) => tag.name.toLowerCase()));
  const otherTagNames = allTags.map((tag) => tag.name).filter((name) => !existingTagNames.has(name.toLowerCase()));
  const visibleSuggestions = aiSuggestions.filter((name) => !existingTagNames.has(name.toLowerCase()));

  return (
    <section className="flex flex-1 flex-col overflow-y-auto bg-white" aria-label="Note editor">
      <div className="flex items-center justify-between border-b border-stone-100 px-8 py-3">
        <span className="text-xs text-stone-400">
          {saveStatus === "saving" && "Saving…"}
          {saveStatus === "saved" && `Edited ${formatRelativeTime(note.updatedAt)}`}
          {saveStatus === "error" && <span className="text-rose-500">Couldn&apos;t save — check your connection</span>}
          {saveStatus === "idle" && `Edited ${formatRelativeTime(note.updatedAt)}`}
        </span>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={onToggleFavorite}
            aria-pressed={note.favorite}
            aria-label={note.favorite ? "Remove from favorites" : "Add to favorites"}
            className={`rounded-lg p-2 hover:bg-stone-100 ${note.favorite ? "text-amber-500" : "text-stone-400"}`}
          >
            <svg
              viewBox="0 0 20 20"
              aria-hidden
              className="h-5 w-5"
              fill={note.favorite ? "currentColor" : "none"}
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <path
                d="M10 17.25s-6.5-4.06-8.5-8.06C.36 6.66 2 3.75 5 3.75c1.7 0 3.15 1 4 2.25.85-1.25 2.3-2.25 4-2.25 3 0 4.64 2.91 3.5 5.44-2 4-8.5 8.06-8.5 8.06Z"
                strokeLinejoin="round"
              />
            </svg>
          </button>
          <button
            type="button"
            onClick={onDelete}
            aria-label="Delete note"
            className="rounded-lg p-2 text-stone-400 hover:bg-rose-50 hover:text-rose-600"
          >
            <svg
              viewBox="0 0 20 20"
              aria-hidden
              className="h-5 w-5"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <path
                d="M4 6h12M8 6V4.5A1.5 1.5 0 0 1 9.5 3h1A1.5 1.5 0 0 1 12 4.5V6m2 0-.6 9.4A1.5 1.5 0 0 1 11.9 17H8.1a1.5 1.5 0 0 1-1.5-1.6L6 6"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        </div>
      </div>

      <div className="flex-1 px-8 py-6">
        <label htmlFor="note-title" className="sr-only">
          Title
        </label>
        <input
          id="note-title"
          value={note.title}
          onChange={(event) => onEdit({ title: event.target.value })}
          placeholder="Untitled note"
          className="w-full border-none p-0 text-3xl font-bold text-stone-900 placeholder-stone-300 focus:outline-none"
        />

        <label htmlFor="note-body" className="sr-only">
          Note
        </label>
        <div className="mt-4">
          <RichTextEditor value={note.body} onChange={(html) => onEdit({ body: html })} />
        </div>

        <div className="mt-8 border-t border-stone-100 pt-4">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-stone-400">Tags</h2>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            {note.tags.map((tag) => (
              <TagPill key={tag.id} name={tag.name} color={tag.color} onRemove={() => onRemoveTag(tag.id)} />
            ))}
            <input
              type="text"
              list="existing-tag-names"
              value={tagDraft}
              onChange={(event) => setTagDraft(event.target.value)}
              onKeyDown={handleTagKeyDown}
              onBlur={submitTag}
              placeholder="+ Add tag"
              aria-label="Add a tag"
              className="w-28 rounded-full border border-dashed border-stone-300 px-2.5 py-0.5 text-xs text-stone-600 focus-visible:border-solid focus-visible:border-teal-600"
            />
            <datalist id="existing-tag-names">
              {otherTagNames.map((name) => (
                <option key={name} value={name} />
              ))}
            </datalist>
          </div>
        </div>

        <div className="mt-4 rounded-xl border border-dashed border-teal-200 bg-teal-50/50 p-4">
          <div className="flex items-center justify-between">
            <h2 className="flex items-center gap-1.5 text-sm font-semibold text-teal-800">
              <SparkleIcon /> Suggested tags
            </h2>
            <button
              type="button"
              onClick={onFetchSuggestions}
              disabled={isFetchingSuggestions}
              className="text-xs font-medium text-teal-700 hover:underline disabled:opacity-60"
            >
              {isFetchingSuggestions ? "Thinking…" : "Suggest tags"}
            </button>
          </div>
          {visibleSuggestions.length > 0 && (
            <ul className="mt-2 flex flex-wrap gap-2">
              {visibleSuggestions.map((name) => (
                <li key={name} className="flex items-center gap-1 rounded-full bg-white px-2 py-1 text-xs shadow-sm">
                  <span className="text-stone-700">{name}</span>
                  <button
                    type="button"
                    onClick={() => onAcceptSuggestion(name)}
                    aria-label={`Accept suggested tag ${name}`}
                    className="rounded-full bg-teal-700 px-1.5 text-white hover:bg-teal-800"
                  >
                    +
                  </button>
                  <button
                    type="button"
                    onClick={() => onDismissSuggestion(name)}
                    aria-label={`Dismiss suggested tag ${name}`}
                    className="rounded-full px-1.5 text-stone-400 hover:bg-stone-100"
                  >
                    ×
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
}

function SparkleIcon() {
  return (
    <svg viewBox="0 0 20 20" aria-hidden className="h-4 w-4" fill="currentColor">
      <path d="M10 2l1.6 4.9L16.5 8l-4.9 1.6L10 14.5l-1.6-4.9L3.5 8l4.9-1.1L10 2Z" />
    </svg>
  );
}
