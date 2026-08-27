import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth/require-user";
import { embedText, isAiConfigured } from "@/lib/ai";
import { cosineSimilarity } from "@/lib/ai/similarity";
import { noteWithTagsInclude, type NoteWithTags } from "@/lib/notes/access";
import { serializeNote } from "@/lib/notes/serialize";
import { BadRequestError, handleApiError } from "@/lib/api/errors";

const MIN_SIMILARITY = 0.5;
const MAX_RESULTS = 20;

/**
 * "Search by meaning" (the bonus feature): embeds the query, embeds each
 * note (computed asynchronously at save time — see `src/lib/notes/embed.ts`)
 * and ranks by cosine similarity, so "grocery" can surface a note titled
 * "Things to buy at the store".
 *
 * Falls back to a plain substring match over title + body whenever
 * semantic search isn't available — no provider configured, the provider
 * call failed, or a given note hasn't been embedded yet — and always
 * unions in any substring matches the ranked list would otherwise miss, so
 * a brand-new note (embedding still computing in the background) never
 * silently disappears from search.
 */
export async function GET(request: Request): Promise<NextResponse> {
  try {
    const user = await requireUser();
    const url = new URL(request.url);
    const q = url.searchParams.get("q")?.trim();
    if (!q) {
      throw new BadRequestError("Query parameter 'q' is required");
    }

    const notes = await db.note.findMany({
      where: { ownerId: user.userId },
      include: noteWithTagsInclude,
      orderBy: { createdAt: "desc" },
    });

    const lowerQuery = q.toLowerCase();
    const substringMatches = notes.filter(
      (note) => note.title.toLowerCase().includes(lowerQuery) || note.body.toLowerCase().includes(lowerQuery),
    );

    const queryEmbedding = isAiConfigured() ? await embedText(q) : null;

    if (!queryEmbedding) {
      return NextResponse.json({ notes: substringMatches.map(serializeNote), mode: "substring" as const });
    }

    const ranked = rankBySimilarity(notes, queryEmbedding);
    const rankedIds = new Set(ranked.map((note) => note.id));
    const combined = [...ranked, ...substringMatches.filter((note) => !rankedIds.has(note.id))];

    return NextResponse.json({ notes: combined.map(serializeNote), mode: "semantic" as const });
  } catch (error) {
    return handleApiError(error);
  }
}

function rankBySimilarity(notes: NoteWithTags[], queryEmbedding: number[]): NoteWithTags[] {
  return notes
    .map((note) => {
      if (!note.embedding) return null;
      const embedding = JSON.parse(note.embedding) as number[];
      return { note, score: cosineSimilarity(queryEmbedding, embedding) };
    })
    .filter((entry): entry is { note: NoteWithTags; score: number } => entry !== null && entry.score >= MIN_SIMILARITY)
    .sort((a, b) => b.score - a.score)
    .slice(0, MAX_RESULTS)
    .map((entry) => entry.note);
}
