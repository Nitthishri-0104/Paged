import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth/require-user";
import { findOwnedNoteOrThrow, noteWithTagsInclude } from "@/lib/notes/access";
import { serializeNote } from "@/lib/notes/serialize";
import { NotFoundError, handleApiError } from "@/lib/api/errors";

const addTagSchema = z.object({ tagId: z.string().cuid() });

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * Attaches one tag to one note. Deliberately a separate, additive endpoint
 * rather than requiring the client to PATCH a full replacement `tagIds`
 * array: two "add a tag" clicks fired close together would otherwise race
 * — the second read-modify-write could overwrite the first tag before its
 * response came back. `upsert` on the join table's composite key makes
 * this call idempotent and race-free regardless of call order.
 */
export async function POST(request: Request, { params }: RouteParams): Promise<NextResponse> {
  try {
    const user = await requireUser();
    const { id: noteId } = await params;
    await findOwnedNoteOrThrow(user.userId, noteId);

    const body: unknown = await request.json().catch(() => null);
    const { tagId } = addTagSchema.parse(body);

    const tag = await db.tag.findFirst({ where: { id: tagId, ownerId: user.userId } });
    if (!tag) {
      throw new NotFoundError("Tag not found");
    }

    await db.noteTag.upsert({
      where: { noteId_tagId: { noteId, tagId } },
      update: {},
      create: { noteId, tagId },
    });

    const note = await db.note.findUniqueOrThrow({ where: { id: noteId }, include: noteWithTagsInclude });
    return NextResponse.json({ note: serializeNote(note) });
  } catch (error) {
    return handleApiError(error);
  }
}
