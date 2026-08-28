import { describe, expect, it } from "vitest";
import { buildNotesOrderBy, buildNotesWhere } from "./query-builder";
import type { NotesQuery } from "@/lib/validation/notes";

const baseQuery: NotesQuery = { q: undefined, sort: "newest", favoritesOnly: false };

describe("buildNotesWhere", () => {
  it("always scopes to the given owner", () => {
    expect(buildNotesWhere("user-1", baseQuery)).toEqual({ ownerId: "user-1" });
  });

  it("adds a case-insensitive title filter when q is set", () => {
    const where = buildNotesWhere("user-1", { ...baseQuery, q: "Wedding" });
    expect(where.title).toEqual({ contains: "Wedding", mode: "insensitive" });
  });

  it("filters by tags with OR semantics (matches any selected tag)", () => {
    const where = buildNotesWhere("user-1", { ...baseQuery, tagIds: ["tag-a", "tag-b"] });
    expect(where.tags).toEqual({ some: { tagId: { in: ["tag-a", "tag-b"] } } });
  });

  it("ignores an empty tagIds array", () => {
    const where = buildNotesWhere("user-1", { ...baseQuery, tagIds: [] });
    expect(where.tags).toBeUndefined();
  });

  it("adds favorite: true only when favoritesOnly is set", () => {
    expect(buildNotesWhere("user-1", { ...baseQuery, favoritesOnly: true }).favorite).toBe(true);
    expect(buildNotesWhere("user-1", baseQuery).favorite).toBeUndefined();
  });

  it("adds a createdAt range when both createdFrom and createdTo are set", () => {
    const where = buildNotesWhere("user-1", {
      ...baseQuery,
      createdFrom: "2026-08-01T00:00:00.000Z",
      createdTo: "2026-08-15T23:59:59.999Z",
    });
    expect(where.createdAt).toEqual({
      gte: new Date("2026-08-01T00:00:00.000Z"),
      lte: new Date("2026-08-15T23:59:59.999Z"),
    });
  });

  it("supports an open-ended createdAt range (only createdFrom)", () => {
    const where = buildNotesWhere("user-1", { ...baseQuery, createdFrom: "2026-08-01T00:00:00.000Z" });
    expect(where.createdAt).toEqual({ gte: new Date("2026-08-01T00:00:00.000Z") });
  });

  it("supports an open-ended createdAt range (only createdTo)", () => {
    const where = buildNotesWhere("user-1", { ...baseQuery, createdTo: "2026-08-15T23:59:59.999Z" });
    expect(where.createdAt).toEqual({ lte: new Date("2026-08-15T23:59:59.999Z") });
  });

  it("omits createdAt entirely when neither bound is set", () => {
    expect(buildNotesWhere("user-1", baseQuery).createdAt).toBeUndefined();
  });
});

describe("buildNotesOrderBy", () => {
  it("orders by createdAt descending for 'newest'", () => {
    expect(buildNotesOrderBy({ ...baseQuery, sort: "newest" })).toEqual({ createdAt: "desc" });
  });

  it("orders by createdAt ascending for 'oldest'", () => {
    expect(buildNotesOrderBy({ ...baseQuery, sort: "oldest" })).toEqual({ createdAt: "asc" });
  });
});
