import { describe, expect, it } from "vitest";
import { createTestUser, authedFetch } from "../helpers";
import type { NoteDTO } from "@/types/note";

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function createNote(
  cookie: string,
  input: { title: string; body?: string; tagIds?: string[] },
): Promise<NoteDTO> {
  const response = await authedFetch("/api/notes", cookie, { method: "POST", body: JSON.stringify(input) });
  const { note } = (await response.json()) as { note: NoteDTO };
  return note;
}

async function createTag(cookie: string, name: string): Promise<{ id: string; name: string }> {
  const response = await authedFetch("/api/tags", cookie, { method: "POST", body: JSON.stringify({ name }) });
  const { tag } = (await response.json()) as { tag: { id: string; name: string } };
  return tag;
}

async function listNotes(cookie: string, query: string): Promise<NoteDTO[]> {
  const response = await authedFetch(`/api/notes?${query}`, cookie);
  const { notes } = (await response.json()) as { notes: NoteDTO[] };
  return notes;
}

describe("notes filtering, search, and sorting", () => {
  it("searches by title substring, case-insensitively", async () => {
    const { cookie } = await createTestUser("search");
    await createNote(cookie, { title: "Wedding Budget Breakdown" });
    await createNote(cookie, { title: "Grocery list" });

    const results = await listNotes(cookie, "q=wedding");
    expect(results).toHaveLength(1);
    expect(results[0].title).toBe("Wedding Budget Breakdown");
  });

  it("filters by tag using OR semantics across multiple tags", async () => {
    const { cookie } = await createTestUser("tagfilter");
    const wedding = await createTag(cookie, "Wedding");
    const work = await createTag(cookie, "Work");
    const untaggedOnly = await createTag(cookie, "Unused");

    await createNote(cookie, { title: "Venue options", tagIds: [wedding.id] });
    await createNote(cookie, { title: "Sprint planning", tagIds: [work.id] });
    await createNote(cookie, { title: "Random note" });

    const both = await listNotes(cookie, `tagId=${wedding.id}&tagId=${work.id}`);
    expect(both.map((note) => note.title).sort()).toEqual(["Sprint planning", "Venue options"]);

    const unused = await listNotes(cookie, `tagId=${untaggedOnly.id}`);
    expect(unused).toHaveLength(0);
  });

  it("filters to favorites only", async () => {
    const { cookie } = await createTestUser("favorites");
    const favorite = await createNote(cookie, { title: "Important" });
    await createNote(cookie, { title: "Not important" });

    await authedFetch(`/api/notes/${favorite.id}`, cookie, {
      method: "PATCH",
      body: JSON.stringify({ favorite: true }),
    });

    const results = await listNotes(cookie, "favoritesOnly=true");
    expect(results).toHaveLength(1);
    expect(results[0].title).toBe("Important");
  });

  it("sorts by creation date, newest or oldest first", async () => {
    const { cookie } = await createTestUser("sorting");
    const first = await createNote(cookie, { title: "First" });
    await sleep(20);
    const second = await createNote(cookie, { title: "Second" });
    await sleep(20);
    const third = await createNote(cookie, { title: "Third" });

    const newestFirst = await listNotes(cookie, "sort=newest");
    expect(newestFirst.map((note) => note.id)).toEqual([third.id, second.id, first.id]);

    const oldestFirst = await listNotes(cookie, "sort=oldest");
    expect(oldestFirst.map((note) => note.id)).toEqual([first.id, second.id, third.id]);
  });
});
