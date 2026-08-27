import type { Metadata } from "next";
import { getSession } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { noteWithTagsInclude } from "@/lib/notes/access";
import { serializeNote } from "@/lib/notes/serialize";
import { NotesApp } from "@/components/notes/notes-app";
import { isAiConfigured } from "@/lib/ai";

export const metadata: Metadata = { title: "Your Notes — Paged" };

export default async function NotesPage() {
  const session = await getSession();
  // The proxy already redirects signed-out visitors to /login before this
  // ever renders; this is just satisfying TypeScript's null check.
  if (!session) return null;

  const [notes, tags] = await Promise.all([
    db.note.findMany({
      where: { ownerId: session.userId },
      orderBy: { createdAt: "desc" },
      include: noteWithTagsInclude,
    }),
    db.tag.findMany({
      where: { ownerId: session.userId },
      orderBy: { name: "asc" },
      select: { id: true, name: true, color: true },
    }),
  ]);

  return (
    <NotesApp
      initialNotes={notes.map(serializeNote)}
      initialTags={tags}
      userEmail={session.email}
      aiChatEnabled={isAiConfigured()}
    />
  );
}
