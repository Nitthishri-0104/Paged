import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth/require-user";
import { suggestTags } from "@/lib/ai";
import { htmlToText } from "@/lib/notes/html-to-text";
import { handleApiError } from "@/lib/api/errors";

const suggestTagsSchema = z.object({
  title: z.string().trim().max(200).optional().default(""),
  body: z.string().trim().max(50_000).optional().default(""),
});

export async function POST(request: Request): Promise<NextResponse> {
  try {
    await requireUser();
    const payload: unknown = await request.json().catch(() => null);
    const { title, body: bodyHtml } = suggestTagsSchema.parse(payload);
    const body = htmlToText(bodyHtml);

    if (!title && !body) {
      return NextResponse.json({ suggestions: [] });
    }

    const suggestions = await suggestTags({ title, body });
    return NextResponse.json({ suggestions });
  } catch (error) {
    return handleApiError(error);
  }
}
