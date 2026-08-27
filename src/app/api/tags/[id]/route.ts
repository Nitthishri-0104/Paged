import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth/require-user";
import { NotFoundError, handleApiError } from "@/lib/api/errors";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function DELETE(_request: Request, { params }: RouteParams): Promise<NextResponse> {
  try {
    const user = await requireUser();
    const { id } = await params;

    const tag = await db.tag.findFirst({ where: { id, ownerId: user.userId } });
    if (!tag) {
      throw new NotFoundError("Tag not found");
    }

    // Cascades to the note_tags join rows via the schema's onDelete: Cascade,
    // so this only detaches the tag from notes — it never deletes a note.
    await db.tag.delete({ where: { id } });

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return handleApiError(error);
  }
}
