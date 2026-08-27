import type { NoteWithTags } from "@/lib/notes/access";
import type { NoteDTO } from "@/types/note";

export function serializeNote(note: NoteWithTags): NoteDTO {
  return {
    id: note.id,
    title: note.title,
    body: note.body,
    favorite: note.favorite,
    createdAt: note.createdAt.toISOString(),
    updatedAt: note.updatedAt.toISOString(),
    tags: note.tags
      .map((noteTag) => ({ id: noteTag.tag.id, name: noteTag.tag.name, color: noteTag.tag.color }))
      .sort((a, b) => a.name.localeCompare(b.name)),
  };
}
