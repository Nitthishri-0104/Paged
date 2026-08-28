import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth/require-user";
import { createNoteSchema, parseNotesQuery } from "@/lib/validation/notes";
import { buildNotesOrderBy, buildNotesWhere } from "@/lib/notes/query-builder";
import { assertTagsOwnedByUser, noteWithTagsInclude } from "@/lib/notes/access";
import { serializeNote } from "@/lib/notes/serialize";
import { sanitizeNoteHtml } from "@/lib/notes/sanitize-html";
import { handleApiError } from "@/lib/api/errors";

export async function GET(request: Request): Promise<NextResponse> {
  try {
    const user = await requireUser();
    const url = new URL(request.url);
    const query = parseNotesQuery(url.searchParams);

    const notes = await db.note.findMany({
      where: buildNotesWhere(user.userId, query),
      orderBy: buildNotesOrderBy(query),
      include: noteWithTagsInclude,
    });

    return NextResponse.json({ notes: notes.map(serializeNote) });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const user = await requireUser();
    const body: unknown = await request.json().catch(() => null);
    const input = createNoteSchema.parse(body);

    await assertTagsOwnedByUser(user.userId, input.tagIds);

    const note = await db.note.create({
      data: {
        title: input.title,
        body: sanitizeNoteHtml(input.body),
        ownerId: user.userId,
        tags: { create: input.tagIds.map((tagId) => ({ tagId })) },
      },
      include: noteWithTagsInclude,
    });

    return NextResponse.json({ note: serializeNote(note) }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
