import { describe, expect, it } from "vitest";
import { createTestUser, authedFetch } from "../helpers";

async function createNote(cookie: string, title = "A private note") {
  const response = await authedFetch("/api/notes", cookie, {
    method: "POST",
    body: JSON.stringify({ title, body: "secret contents" }),
  });
  const { note } = (await response.json()) as { note: { id: string } };
  return note.id;
}

describe("note ownership enforcement", () => {
  it("lets an owner read, update, and delete their own note", async () => {
    const { cookie } = await createTestUser("owner");
    const noteId = await createNote(cookie);

    const getResponse = await authedFetch(`/api/notes/${noteId}`, cookie);
    expect(getResponse.status).toBe(200);

    const patchResponse = await authedFetch(`/api/notes/${noteId}`, cookie, {
      method: "PATCH",
      body: JSON.stringify({ title: "Updated title" }),
    });
    expect(patchResponse.status).toBe(200);

    const deleteResponse = await authedFetch(`/api/notes/${noteId}`, cookie, { method: "DELETE" });
    expect(deleteResponse.status).toBe(204);
  });

  it("hides another user's note behind 404 for read, update, and delete", async () => {
    const owner = await createTestUser("owner-b");
    const intruder = await createTestUser("intruder");
    const noteId = await createNote(owner.cookie);

    const getResponse = await authedFetch(`/api/notes/${noteId}`, intruder.cookie);
    expect(getResponse.status).toBe(404);

    const patchResponse = await authedFetch(`/api/notes/${noteId}`, intruder.cookie, {
      method: "PATCH",
      body: JSON.stringify({ title: "Hijacked" }),
    });
    expect(patchResponse.status).toBe(404);

    const deleteResponse = await authedFetch(`/api/notes/${noteId}`, intruder.cookie, { method: "DELETE" });
    expect(deleteResponse.status).toBe(404);

    // Confirm the delete attempt was truly a no-op.
    const stillThere = await authedFetch(`/api/notes/${noteId}`, owner.cookie);
    expect(stillThere.status).toBe(200);
  });

  it("never lists another user's notes", async () => {
    const userA = await createTestUser("list-a");
    const userB = await createTestUser("list-b");
    await createNote(userA.cookie, "User A's note");
    await createNote(userB.cookie, "User B's note");

    const listA = (await (await authedFetch("/api/notes", userA.cookie)).json()) as { notes: { title: string }[] };
    expect(listA.notes).toHaveLength(1);
    expect(listA.notes[0].title).toBe("User A's note");
  });

  it("rejects attaching another user's tag id to a note", async () => {
    const owner = await createTestUser("tag-owner");
    const other = await createTestUser("tag-other");

    const tagResponse = await authedFetch("/api/tags", other.cookie, {
      method: "POST",
      body: JSON.stringify({ name: "OthersTag" }),
    });
    const { tag } = (await tagResponse.json()) as { tag: { id: string } };

    const createResponse = await authedFetch("/api/notes", owner.cookie, {
      method: "POST",
      body: JSON.stringify({ title: "Note", body: "", tagIds: [tag.id] }),
    });
    expect(createResponse.status).toBe(400);
  });
});
