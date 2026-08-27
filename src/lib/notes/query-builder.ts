import type { Prisma } from "@prisma/client";
import type { NotesQuery } from "@/lib/validation/notes";

/**
 * Builds the Prisma `where`/`orderBy` clauses for the notes list from a
 * validated query. Kept separate from the route handler so filtering and
 * sorting behavior can be unit tested against plain objects instead of a
 * live database.
 *
 * Tag filtering uses OR semantics: a note matches if it has *any* of the
 * selected tags, mirroring the toggle-able tag chips in the UI (selecting
 * "Wedding" and "Budget" surfaces notes tagged with either, not only notes
 * tagged with both).
 */
export function buildNotesWhere(ownerId: string, query: NotesQuery): Prisma.NoteWhereInput {
  const where: Prisma.NoteWhereInput = { ownerId };

  if (query.q) {
    where.title = { contains: query.q, mode: "insensitive" };
  }

  if (query.tagIds && query.tagIds.length > 0) {
    where.tags = { some: { tagId: { in: query.tagIds } } };
  }

  if (query.favoritesOnly) {
    where.favorite = true;
  }

  return where;
}

export function buildNotesOrderBy(query: NotesQuery): Prisma.NoteOrderByWithRelationInput {
  return { createdAt: query.sort === "oldest" ? "asc" : "desc" };
}
