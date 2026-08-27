import { describe, expect, it } from "vitest";
import { createTestUser, authedFetch } from "../helpers";
import type { NoteDTO } from "@/types/note";

describe("tags", () => {
  it("creates a tag and is idempotent for the same name", async () => {
    const { cookie } = await createTestUser("tag-create");

    const first = await authedFetch("/api/tags", cookie, { method: "POST", body: JSON.stringify({ name: "Work" }) });
    expect(first.status).toBe(201);
    const { tag: firstTag } = (await first.json()) as { tag: { id: string } };

    const second = await authedFetch("/api/tags", cookie, { method: "POST", body: JSON.stringify({ name: "Work" }) });
    const { tag: secondTag } = (await second.json()) as { tag: { id: string } };

    expect(secondTag.id).toBe(firstTag.id);

    const list = (await (await authedFetch("/api/tags", cookie)).json()) as { tags: { name: string }[] };
    expect(list.tags).toHaveLength(1);
  });

  it("adds and removes a tag from a note without disturbing other tags", async () => {
    const { cookie } = await createTestUser("tag-attach");
    const noteResponse = await authedFetch("/api/notes", cookie, {
      method: "POST",
      body: JSON.stringify({ title: "Note", body: "" }),
    });
    const { note } = (await noteResponse.json()) as { note: NoteDTO };

    const tagAResponse = await authedFetch("/api/tags", cookie, {
      method: "POST",
      body: JSON.stringify({ name: "A" }),
    });
    const { tag: tagA } = (await tagAResponse.json()) as { tag: { id: string } };
    const tagBResponse = await authedFetch("/api/tags", cookie, {
      method: "POST",
      body: JSON.stringify({ name: "B" }),
    });
    const { tag: tagB } = (await tagBResponse.json()) as { tag: { id: string } };

    await authedFetch(`/api/notes/${note.id}/tags`, cookie, {
      method: "POST",
      body: JSON.stringify({ tagId: tagA.id }),
    });
    const afterFirst = await authedFetch(`/api/notes/${note.id}/tags`, cookie, {
      method: "POST",
      body: JSON.stringify({ tagId: tagB.id }),
    });
    const { note: afterBoth } = (await afterFirst.json()) as { note: NoteDTO };
    expect(afterBoth.tags.map((tag) => tag.name).sort()).toEqual(["A", "B"]);

    const afterRemove = await authedFetch(`/api/notes/${note.id}/tags/${tagA.id}`, cookie, { method: "DELETE" });
    const { note: afterRemoveBody } = (await afterRemove.json()) as { note: NoteDTO };
    expect(afterRemoveBody.tags.map((tag) => tag.name)).toEqual(["B"]);
  });

  it("deleting a tag detaches it from notes without deleting the note", async () => {
    const { cookie } = await createTestUser("tag-delete");
    const tagResponse = await authedFetch("/api/tags", cookie, {
      method: "POST",
      body: JSON.stringify({ name: "Temp" }),
    });
    const { tag } = (await tagResponse.json()) as { tag: { id: string } };

    const noteResponse = await authedFetch("/api/notes", cookie, {
      method: "POST",
      body: JSON.stringify({ title: "Note", body: "", tagIds: [tag.id] }),
    });
    const { note } = (await noteResponse.json()) as { note: NoteDTO };
    expect(note.tags).toHaveLength(1);

    const deleteResponse = await authedFetch(`/api/tags/${tag.id}`, cookie, { method: "DELETE" });
    expect(deleteResponse.status).toBe(204);

    const refetched = (await (await authedFetch(`/api/notes/${note.id}`, cookie)).json()) as { note: NoteDTO };
    expect(refetched.note.tags).toHaveLength(0);
  });

  it("does not let a user delete another user's tag", async () => {
    const owner = await createTestUser("tag-owner-del");
    const other = await createTestUser("tag-other-del");
    const tagResponse = await authedFetch("/api/tags", owner.cookie, {
      method: "POST",
      body: JSON.stringify({ name: "Mine" }),
    });
    const { tag } = (await tagResponse.json()) as { tag: { id: string } };

    const response = await authedFetch(`/api/tags/${tag.id}`, other.cookie, { method: "DELETE" });
    expect(response.status).toBe(404);
  });
});
