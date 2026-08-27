import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth/require-user";
import { findOwnedNoteOrThrow, noteWithTagsInclude } from "@/lib/notes/access";
import { serializeNote } from "@/lib/notes/serialize";
import { handleApiError } from "@/lib/api/errors";

interface RouteParams {
  params: Promise<{ id: string; tagId: string }>;
}

/** Detaches one tag from one note. See `../route.ts` for why this is a dedicated endpoint. */
export async function DELETE(_request: Request, { params }: RouteParams): Promise<NextResponse> {
  try {
    const user = await requireUser();
    const { id: noteId, tagId } = await params;
    await findOwnedNoteOrThrow(user.userId, noteId);

    await db.noteTag.deleteMany({ where: { noteId, tagId } });

    const note = await db.note.findUniqueOrThrow({ where: { id: noteId }, include: noteWithTagsInclude });
    return NextResponse.json({ note: serializeNote(note) });
  } catch (error) {
    return handleApiError(error);
  }
}
