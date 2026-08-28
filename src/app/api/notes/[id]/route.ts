import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth/require-user";
import { updateNoteSchema } from "@/lib/validation/notes";
import { assertTagsOwnedByUser, findOwnedNoteOrThrow, noteWithTagsInclude } from "@/lib/notes/access";
import { serializeNote } from "@/lib/notes/serialize";
import { sanitizeNoteHtml } from "@/lib/notes/sanitize-html";
import { handleApiError } from "@/lib/api/errors";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(_request: Request, { params }: RouteParams): Promise<NextResponse> {
  try {
    const user = await requireUser();
    const { id } = await params;
    const note = await findOwnedNoteOrThrow(user.userId, id);
    return NextResponse.json({ note: serializeNote(note) });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(request: Request, { params }: RouteParams): Promise<NextResponse> {
  try {
    const user = await requireUser();
    const { id } = await params;
    await findOwnedNoteOrThrow(user.userId, id);

    const body: unknown = await request.json().catch(() => null);
    const input = updateNoteSchema.parse(body);

    if (input.tagIds) {
      await assertTagsOwnedByUser(user.userId, input.tagIds);
    }

    const note = await db.note.update({
      where: { id },
      data: {
        ...(input.title !== undefined && { title: input.title }),
        ...(input.body !== undefined && { body: sanitizeNoteHtml(input.body) }),
        ...(input.favorite !== undefined && { favorite: input.favorite }),
        ...(input.tagIds !== undefined && {
          tags: {
            deleteMany: {},
            create: input.tagIds.map((tagId) => ({ tagId })),
          },
        }),
      },
      include: noteWithTagsInclude,
    });

    return NextResponse.json({ note: serializeNote(note) });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(_request: Request, { params }: RouteParams): Promise<NextResponse> {
  try {
    const user = await requireUser();
    const { id } = await params;
    await findOwnedNoteOrThrow(user.userId, id);

    await db.note.delete({ where: { id } });

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return handleApiError(error);
  }
}
