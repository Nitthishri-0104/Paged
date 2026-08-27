import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth/require-user";
import { suggestTags } from "@/lib/ai";
import { handleApiError } from "@/lib/api/errors";

const suggestTagsSchema = z.object({
  title: z.string().trim().max(200).optional().default(""),
  body: z.string().trim().max(20_000).optional().default(""),
});

export async function POST(request: Request): Promise<NextResponse> {
  try {
    await requireUser();
    const payload: unknown = await request.json().catch(() => null);
    const { title, body } = suggestTagsSchema.parse(payload);

    if (!title && !body) {
      return NextResponse.json({ suggestions: [] });
    }

    const suggestions = await suggestTags({ title, body });
    return NextResponse.json({ suggestions });
  } catch (error) {
    return handleApiError(error);
  }
}
