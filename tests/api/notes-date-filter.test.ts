import { describe, expect, it } from "vitest";
import { createTestUser, authedFetch } from "../helpers";
import { db } from "@/lib/db";
import type { NoteDTO } from "@/types/note";

async function createNote(cookie: string, input: { title: string; body?: string }): Promise<NoteDTO> {
  const response = await authedFetch("/api/notes", cookie, { method: "POST", body: JSON.stringify(input) });
  const { note } = (await response.json()) as { note: NoteDTO };
  return note;
}

/**
 * The public API deliberately never lets a client set `createdAt` — it's
 * server-assigned. Boundary-testing a date-range filter needs precise
 * control over it, so these tests reach around the API and set it directly
 * in the (real, test-only) database, exactly like `createNote` above talks
 * to that same database through the real HTTP API.
 */
async function setCreatedAt(noteId: string, createdAt: Date): Promise<void> {
  await db.note.update({ where: { id: noteId }, data: { createdAt } });
}

async function listNotes(cookie: string, query: string): Promise<NoteDTO[]> {
  const response = await authedFetch(`/api/notes?${query}`, cookie);
  const { notes } = (await response.json()) as { notes: NoteDTO[] };
  return notes;
}

describe("notes date-range filtering", () => {
  it("filters to notes created within an inclusive createdFrom/createdTo range", async () => {
    const { cookie } = await createTestUser("datefilter");

    const inRangeEarly = await createNote(cookie, { title: "In range, early" });
    const inRangeLate = await createNote(cookie, { title: "In range, late" });
    const before = await createNote(cookie, { title: "Before range" });
    const after = await createNote(cookie, { title: "After range" });

    await setCreatedAt(inRangeEarly.id, new Date("2026-08-05T00:00:00.000Z"));
    await setCreatedAt(inRangeLate.id, new Date("2026-08-15T23:59:59.999Z"));
    await setCreatedAt(before.id, new Date("2026-07-31T23:59:59.999Z"));
    await setCreatedAt(after.id, new Date("2026-08-16T00:00:00.000Z"));

    const results = await listNotes(cookie, "createdFrom=2026-08-01T00:00:00.000Z&createdTo=2026-08-15T23:59:59.999Z");
    expect(results.map((note) => note.title).sort()).toEqual(["In range, early", "In range, late"]);
  });

  it("includes a note created exactly at the range boundary (inclusive on both ends)", async () => {
    const { cookie } = await createTestUser("datefilter-boundary");
    const exactlyAtStart = await createNote(cookie, { title: "Exactly at start" });
    const exactlyAtEnd = await createNote(cookie, { title: "Exactly at end" });

    await setCreatedAt(exactlyAtStart.id, new Date("2026-08-01T00:00:00.000Z"));
    await setCreatedAt(exactlyAtEnd.id, new Date("2026-08-01T23:59:59.999Z"));

    const results = await listNotes(cookie, "createdFrom=2026-08-01T00:00:00.000Z&createdTo=2026-08-01T23:59:59.999Z");
    expect(results.map((note) => note.title).sort()).toEqual(["Exactly at end", "Exactly at start"]);
  });

  it("supports an open-ended range with only createdFrom or only createdTo", async () => {
    const { cookie } = await createTestUser("datefilter-openended");
    const old = await createNote(cookie, { title: "Old note" });
    const recent = await createNote(cookie, { title: "Recent note" });
    await setCreatedAt(old.id, new Date("2026-01-01T00:00:00.000Z"));
    await setCreatedAt(recent.id, new Date("2026-08-01T00:00:00.000Z"));

    const fromOnly = await listNotes(cookie, "createdFrom=2026-06-01T00:00:00.000Z");
    expect(fromOnly.map((note) => note.title)).toEqual(["Recent note"]);

    const toOnly = await listNotes(cookie, "createdTo=2026-06-01T00:00:00.000Z");
    expect(toOnly.map((note) => note.title)).toEqual(["Old note"]);
  });

  it("combines the date filter with title search (AND, not OR)", async () => {
    const { cookie } = await createTestUser("datefilter-combined");
    const javaInRange = await createNote(cookie, { title: "Java notes" });
    const javaOutOfRange = await createNote(cookie, { title: "Java history" });
    const pythonInRange = await createNote(cookie, { title: "Python notes" });

    await setCreatedAt(javaInRange.id, new Date("2026-08-10T00:00:00.000Z"));
    await setCreatedAt(javaOutOfRange.id, new Date("2026-01-01T00:00:00.000Z"));
    await setCreatedAt(pythonInRange.id, new Date("2026-08-10T00:00:00.000Z"));

    const results = await listNotes(
      cookie,
      "q=java&createdFrom=2026-08-01T00:00:00.000Z&createdTo=2026-08-31T23:59:59.999Z",
    );
    expect(results.map((note) => note.title)).toEqual(["Java notes"]);
  });

  it("returns all notes in range when the search query is empty", async () => {
    const { cookie } = await createTestUser("datefilter-emptyquery");
    const note = await createNote(cookie, { title: "Anything" });
    await setCreatedAt(note.id, new Date("2026-08-10T00:00:00.000Z"));

    const results = await listNotes(cookie, "createdFrom=2026-08-01T00:00:00.000Z&createdTo=2026-08-31T23:59:59.999Z");
    expect(results.map((note) => note.title)).toEqual(["Anything"]);
  });

  it("returns an empty list, not an error, when nothing falls in range", async () => {
    const { cookie } = await createTestUser("datefilter-empty");
    const note = await createNote(cookie, { title: "Outside" });
    await setCreatedAt(note.id, new Date("2020-01-01T00:00:00.000Z"));

    const results = await listNotes(cookie, "createdFrom=2026-08-01T00:00:00.000Z&createdTo=2026-08-31T23:59:59.999Z");
    expect(results).toEqual([]);
  });

  it("rejects a range where createdFrom is after createdTo with a clear 400", async () => {
    const { cookie } = await createTestUser("datefilter-invalid");
    const response = await authedFetch(
      "/api/notes?createdFrom=2026-08-15T00:00:00.000Z&createdTo=2026-08-01T00:00:00.000Z",
      cookie,
    );
    expect(response.status).toBe(400);
    const body = (await response.json()) as { error: string };
    expect(body.error).toMatch(/on or before/);
  });

  it("behaves exactly as before when no date filter is given", async () => {
    const { cookie } = await createTestUser("datefilter-none");
    await createNote(cookie, { title: "Unfiltered note" });

    const results = await listNotes(cookie, "");
    expect(results.map((note) => note.title)).toEqual(["Unfiltered note"]);
  });
});
