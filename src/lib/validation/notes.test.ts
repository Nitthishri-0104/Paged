import { describe, expect, it } from "vitest";
import { createNoteSchema, notesQuerySchema, parseNotesQuery, updateNoteSchema } from "./notes";

describe("createNoteSchema", () => {
  it("defaults body to empty string and tagIds to an empty array", () => {
    const result = createNoteSchema.parse({ title: "My note" });
    expect(result).toEqual({ title: "My note", body: "", tagIds: [] });
  });

  it("trims the title and rejects an empty one", () => {
    expect(createNoteSchema.parse({ title: "  Padded  " }).title).toBe("Padded");
    expect(createNoteSchema.safeParse({ title: "   " }).success).toBe(false);
  });

  it("rejects more than 20 tags", () => {
    const tagIds = Array.from({ length: 21 }, (_, i) => `cku${i.toString().padStart(21, "0")}`);
    const result = createNoteSchema.safeParse({ title: "Note", tagIds });
    expect(result.success).toBe(false);
  });
});

describe("updateNoteSchema", () => {
  it("rejects an empty patch", () => {
    expect(updateNoteSchema.safeParse({}).success).toBe(false);
  });

  it("accepts a partial patch with just one field", () => {
    expect(updateNoteSchema.safeParse({ favorite: true }).success).toBe(true);
  });
});

describe("notesQuerySchema / parseNotesQuery", () => {
  it("defaults to sort=newest and no filters", () => {
    const result = notesQuerySchema.parse({});
    expect(result.sort).toBe("newest");
    expect(result.favoritesOnly).toBe(false);
    expect(result.tagIds).toBeUndefined();
  });

  it("parses q, repeated tagId, sort, and favoritesOnly from URLSearchParams", () => {
    const tagId1 = "ckv00000000000000000001";
    const tagId2 = "ckv00000000000000000002";
    const params = new URLSearchParams();
    params.set("q", "wedding");
    params.append("tagId", tagId1);
    params.append("tagId", tagId2);
    params.set("sort", "oldest");
    params.set("favoritesOnly", "true");

    const result = parseNotesQuery(params);
    expect(result).toEqual({
      q: "wedding",
      tagIds: [tagId1, tagId2],
      sort: "oldest",
      favoritesOnly: true,
    });
  });

  it("treats a blank q as absent rather than an empty-string filter", () => {
    const params = new URLSearchParams();
    params.set("q", "   ");
    const result = parseNotesQuery(params);
    expect(result.q).toBeUndefined();
  });
});
