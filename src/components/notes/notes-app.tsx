"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { NoteDTO, SearchMode, TagDTO } from "@/types/note";
import type { SortOption } from "@/lib/validation/notes";
import { apiFetch, ApiClientError } from "@/lib/api-client";
import { Sidebar, type ViewFilter } from "@/components/notes/sidebar";
import { NoteList } from "@/components/notes/note-list";
import { NoteEditor, type SaveStatus } from "@/components/notes/note-editor";

const SEARCH_DEBOUNCE_MS = 350;
const EDIT_DEBOUNCE_MS = 700;

export function NotesApp({
  initialNotes,
  initialTags,
  userEmail,
}: {
  initialNotes: NoteDTO[];
  initialTags: TagDTO[];
  userEmail: string;
}) {
  const [notes, setNotes] = useState(initialNotes);
  const [tags, setTags] = useState(initialTags);
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(initialNotes[0]?.id ?? null);

  // Kept separate from `notes` (which reflects whatever filter is active)
  // so the sidebar's "All Notes" / "Favorites" counts stay accurate no
  // matter which view or filter is currently applied.
  const [counts, setCounts] = useState({
    total: initialNotes.length,
    favorites: initialNotes.filter((note) => note.favorite).length,
  });

  const refreshCounts = useCallback(async () => {
    try {
      const [all, favorites] = await Promise.all([
        apiFetch<{ notes: NoteDTO[] }>("/api/notes"),
        apiFetch<{ notes: NoteDTO[] }>("/api/notes?favoritesOnly=true"),
      ]);
      setCounts({ total: all.notes.length, favorites: favorites.notes.length });
    } catch {
      // Sidebar counts are a nice-to-have; a failure here shouldn't surface
      // as a user-facing error.
    }
  }, []);

  const [view, setView] = useState<ViewFilter>("all");
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [searchMode, setSearchMode] = useState<SearchMode>("substring");
  const [resolvedSearchMode, setResolvedSearchMode] = useState<SearchMode | null>(null);
  const [sort, setSort] = useState<SortOption>("newest");

  const [isListLoading, setIsListLoading] = useState(false);
  const [listError, setListError] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [aiSuggestions, setAiSuggestions] = useState<string[]>([]);
  const [isFetchingSuggestions, setIsFetchingSuggestions] = useState(false);

  const pendingPatches = useRef<Map<string, Partial<Pick<NoteDTO, "title" | "body">>>>(new Map());
  const debounceTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  // Debounce the search box so every keystroke doesn't fire a request.
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(searchQuery), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const updateNoteLocally = useCallback((noteId: string, patch: Partial<NoteDTO>) => {
    setNotes((prev) => prev.map((existing) => (existing.id === noteId ? { ...existing, ...patch } : existing)));
  }, []);

  const flushNote = useCallback(
    async (noteId: string) => {
      const patch = pendingPatches.current.get(noteId);
      if (!patch) return;
      pendingPatches.current.delete(noteId);

      setSaveStatus("saving");
      try {
        const { note } = await apiFetch<{ note: NoteDTO }>(`/api/notes/${noteId}`, {
          method: "PATCH",
          body: JSON.stringify(patch),
        });
        updateNoteLocally(noteId, note);
        setSaveStatus("saved");
      } catch (error) {
        setSaveStatus("error");
        setListError(error instanceof ApiClientError ? error.message : "Failed to save note");
      }
    },
    [updateNoteLocally],
  );

  // Refetch the notes list whenever a filter changes.
  useEffect(() => {
    const controller = new AbortController();

    async function load() {
      setIsListLoading(true);
      setListError(null);
      try {
        if (searchMode === "semantic" && debouncedQuery) {
          const data = await apiFetch<{ notes: NoteDTO[]; mode: SearchMode }>(
            `/api/notes/search?q=${encodeURIComponent(debouncedQuery)}`,
            { signal: controller.signal },
          );
          setNotes(data.notes);
          setResolvedSearchMode(data.mode);
        } else {
          const params = new URLSearchParams();
          if (debouncedQuery) params.set("q", debouncedQuery);
          for (const tagId of selectedTagIds) params.append("tagId", tagId);
          params.set("sort", sort);
          if (view === "favorites") params.set("favoritesOnly", "true");

          const data = await apiFetch<{ notes: NoteDTO[] }>(`/api/notes?${params.toString()}`, {
            signal: controller.signal,
          });
          setNotes(data.notes);
          setResolvedSearchMode(null);
        }
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setListError(error instanceof ApiClientError ? error.message : "Failed to load notes");
      } finally {
        setIsListLoading(false);
      }
    }

    void load();
    return () => controller.abort();
  }, [debouncedQuery, selectedTagIds, sort, view, searchMode]);

  const selectedNote = useMemo(() => notes.find((note) => note.id === selectedNoteId) ?? null, [notes, selectedNoteId]);

  function selectNote(id: string) {
    if (selectedNoteId && debounceTimers.current.has(selectedNoteId)) {
      clearTimeout(debounceTimers.current.get(selectedNoteId));
      debounceTimers.current.delete(selectedNoteId);
      void flushNote(selectedNoteId);
    }
    setAiSuggestions([]);
    setSaveStatus("idle");
    setSelectedNoteId(id);
  }

  function toggleTagFilter(tagId: string) {
    setSelectedTagIds((prev) => (prev.includes(tagId) ? prev.filter((id) => id !== tagId) : [...prev, tagId]));
  }

  async function createNote() {
    setIsCreating(true);
    try {
      const { note } = await apiFetch<{ note: NoteDTO }>("/api/notes", {
        method: "POST",
        body: JSON.stringify({ title: "Untitled note", body: "" }),
      });
      setNotes((prev) => [note, ...prev]);
      setSelectedNoteId(note.id);
      setAiSuggestions([]);
      void refreshCounts();
    } catch (error) {
      setListError(error instanceof ApiClientError ? error.message : "Failed to create note");
    } finally {
      setIsCreating(false);
    }
  }

  function editNote(noteId: string, patch: { title?: string; body?: string }) {
    updateNoteLocally(noteId, patch);
    pendingPatches.current.set(noteId, { ...pendingPatches.current.get(noteId), ...patch });

    const existingTimer = debounceTimers.current.get(noteId);
    if (existingTimer) clearTimeout(existingTimer);
    debounceTimers.current.set(
      noteId,
      setTimeout(() => void flushNote(noteId), EDIT_DEBOUNCE_MS),
    );
  }

  async function patchNoteNow(noteId: string, patch: Record<string, unknown>) {
    try {
      const { note } = await apiFetch<{ note: NoteDTO }>(`/api/notes/${noteId}`, {
        method: "PATCH",
        body: JSON.stringify(patch),
      });
      updateNoteLocally(noteId, note);
      if ("favorite" in patch) void refreshCounts();
    } catch (error) {
      setListError(error instanceof ApiClientError ? error.message : "Failed to update note");
    }
  }

  async function deleteNote(noteId: string) {
    if (!window.confirm("Delete this note? This can't be undone.")) return;
    try {
      await apiFetch(`/api/notes/${noteId}`, { method: "DELETE" });
      setNotes((prev) => prev.filter((note) => note.id !== noteId));
      if (selectedNoteId === noteId) setSelectedNoteId(null);
      void refreshCounts();
    } catch (error) {
      setListError(error instanceof ApiClientError ? error.message : "Failed to delete note");
    }
  }

  async function ensureTag(name: string): Promise<TagDTO> {
    const { tag } = await apiFetch<{ tag: TagDTO }>("/api/tags", {
      method: "POST",
      body: JSON.stringify({ name }),
    });
    setTags((prev) =>
      prev.some((existing) => existing.id === tag.id)
        ? prev
        : [...prev, tag].sort((a, b) => a.name.localeCompare(b.name)),
    );
    return tag;
  }

  // These call dedicated add/remove-one-tag endpoints (not a PATCH with a
  // full replacement `tagIds` array) specifically so that accepting two AI
  // suggestions back-to-back can't race: each request is additive at the
  // database level, so call order never loses a tag.
  async function addTagToSelectedNote(name: string) {
    if (!selectedNote) return;
    const noteId = selectedNote.id;
    try {
      const tag = await ensureTag(name);
      const { note } = await apiFetch<{ note: NoteDTO }>(`/api/notes/${noteId}/tags`, {
        method: "POST",
        body: JSON.stringify({ tagId: tag.id }),
      });
      updateNoteLocally(noteId, note);
    } catch (error) {
      setListError(error instanceof ApiClientError ? error.message : "Failed to add tag");
    }
  }

  async function removeTagFromSelectedNote(tagId: string) {
    if (!selectedNote) return;
    const noteId = selectedNote.id;
    try {
      const { note } = await apiFetch<{ note: NoteDTO }>(`/api/notes/${noteId}/tags/${tagId}`, { method: "DELETE" });
      updateNoteLocally(noteId, note);
    } catch (error) {
      setListError(error instanceof ApiClientError ? error.message : "Failed to remove tag");
    }
  }

  async function fetchSuggestions() {
    if (!selectedNote) return;
    setIsFetchingSuggestions(true);
    try {
      const { suggestions } = await apiFetch<{ suggestions: string[] }>("/api/ai/suggest-tags", {
        method: "POST",
        body: JSON.stringify({ title: selectedNote.title, body: selectedNote.body }),
      });
      setAiSuggestions(suggestions);
    } catch (error) {
      setListError(error instanceof ApiClientError ? error.message : "Failed to get tag suggestions");
    } finally {
      setIsFetchingSuggestions(false);
    }
  }

  async function acceptSuggestion(name: string) {
    setAiSuggestions((prev) => prev.filter((suggestion) => suggestion !== name));
    await addTagToSelectedNote(name);
  }

  function dismissSuggestion(name: string) {
    setAiSuggestions((prev) => prev.filter((suggestion) => suggestion !== name));
  }

  return (
    <div className="flex h-screen">
      <Sidebar
        userEmail={userEmail}
        tags={tags}
        selectedTagIds={selectedTagIds}
        onToggleTag={toggleTagFilter}
        view={view}
        onChangeView={setView}
        totalCount={counts.total}
        favoriteCount={counts.favorites}
      />
      <NoteList
        notes={notes}
        selectedNoteId={selectedNoteId}
        onSelect={selectNote}
        onCreateNote={createNote}
        isCreating={isCreating}
        searchQuery={searchQuery}
        onSearchQueryChange={setSearchQuery}
        searchMode={searchMode}
        onSearchModeChange={setSearchMode}
        sort={sort}
        onSortChange={setSort}
        isLoading={isListLoading}
        error={listError}
        resolvedSearchMode={resolvedSearchMode}
      />
      <NoteEditor
        note={selectedNote}
        allTags={tags}
        saveStatus={saveStatus}
        onEdit={(patch) => selectedNote && editNote(selectedNote.id, patch)}
        onToggleFavorite={() =>
          selectedNote && void patchNoteNow(selectedNote.id, { favorite: !selectedNote.favorite })
        }
        onDelete={() => selectedNote && void deleteNote(selectedNote.id)}
        onAddTag={(name) => void addTagToSelectedNote(name)}
        onRemoveTag={removeTagFromSelectedNote}
        aiSuggestions={aiSuggestions}
        isFetchingSuggestions={isFetchingSuggestions}
        onFetchSuggestions={() => void fetchSuggestions()}
        onAcceptSuggestion={(name) => void acceptSuggestion(name)}
        onDismissSuggestion={dismissSuggestion}
      />
    </div>
  );
}
