import { db } from "@/lib/db";
import { BadRequestError, NotFoundError } from "@/lib/api/errors";
import type { Prisma } from "@prisma/client";

export const noteWithTagsInclude = {
  tags: { include: { tag: true } },
} satisfies Prisma.NoteInclude;

export type NoteWithTags = Prisma.NoteGetPayload<{ include: typeof noteWithTagsInclude }>;

/**
 * The core ownership check: a note is only ever looked up scoped to the
 * requesting user's id. If it doesn't match, we report 404 rather than 403
 * so the response never confirms that a note with this id exists for
 * someone else.
 */
export async function findOwnedNoteOrThrow(ownerId: string, noteId: string): Promise<NoteWithTags> {
  const note = await db.note.findFirst({
    where: { id: noteId, ownerId },
    include: noteWithTagsInclude,
  });
  if (!note) {
    throw new NotFoundError("Note not found");
  }
  return note;
}

/**
 * Guards against attaching another user's tag to a note by id. Without this,
 * a signed-in user could guess or enumerate another user's tag ids and use
 * them in a create/update payload.
 */
export async function assertTagsOwnedByUser(ownerId: string, tagIds: string[]): Promise<void> {
  if (tagIds.length === 0) return;
  const uniqueIds = [...new Set(tagIds)];
  const ownedCount = await db.tag.count({ where: { id: { in: uniqueIds }, ownerId } });
  if (ownedCount !== uniqueIds.length) {
    throw new BadRequestError("One or more tags do not exist");
  }
}
