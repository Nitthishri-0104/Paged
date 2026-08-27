import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth/require-user";
import { chatWithGemini } from "@/lib/ai/chat";
import { isAiConfigured } from "@/lib/ai";
import { BadRequestError, handleApiError } from "@/lib/api/errors";

const chatMessageSchema = z.object({
  role: z.enum(["user", "model"]),
  text: z.string().trim().min(1).max(4000),
});

const chatRequestSchema = z.object({
  messages: z.array(chatMessageSchema).min(1).max(40),
});

export async function POST(request: Request): Promise<NextResponse> {
  try {
    await requireUser();

    if (!isAiConfigured()) {
      throw new BadRequestError("AI chat isn't configured on this deployment");
    }

    const body: unknown = await request.json().catch(() => null);
    const { messages } = chatRequestSchema.parse(body);

    const reply = await chatWithGemini(messages);
    return NextResponse.json({ reply });
  } catch (error) {
    return handleApiError(error);
  }
}
