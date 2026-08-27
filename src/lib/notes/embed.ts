import "server-only";
import { after } from "next/server";
import { db } from "@/lib/db";
import { embedText } from "@/lib/ai";

/**
 * Schedules embedding computation to run after the response has already
 * been sent (via Next's `after()`), so note create/update stays fast even
 * though a real embedding call can take a second or more. If it fails or
 * no provider is configured, the note simply keeps `embedding: null` and
 * search transparently falls back to substring matching for it.
 */
export function scheduleEmbedding(noteId: string, title: string, body: string): void {
  after(async () => {
    const embedding = await embedText(`${title}\n\n${body}`);
    if (!embedding) return;

    await db.note
      .update({ where: { id: noteId }, data: { embedding: JSON.stringify(embedding) } })
      .catch((error: unknown) => {
        console.error(`[ai] failed to persist embedding for note ${noteId}:`, error);
      });
  });
}
