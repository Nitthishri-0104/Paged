import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth/require-user";
import { createTagSchema } from "@/lib/validation/tags";
import { handleApiError } from "@/lib/api/errors";

export async function GET(): Promise<NextResponse> {
  try {
    const user = await requireUser();
    const tags = await db.tag.findMany({
      where: { ownerId: user.userId },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    });
    return NextResponse.json({ tags });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const user = await requireUser();
    const body: unknown = await request.json().catch(() => null);
    const { name } = createTagSchema.parse(body);

    // Upsert rather than insert-or-409: both the "add a tag" form and the
    // "accept an AI-suggested tag" flow just want "make sure this tag
    // exists and give me its id" — a duplicate name isn't an error there.
    const tag = await db.tag.upsert({
      where: { ownerId_name: { ownerId: user.userId, name } },
      update: {},
      create: { name, ownerId: user.userId },
      select: { id: true, name: true },
    });
    return NextResponse.json({ tag }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
