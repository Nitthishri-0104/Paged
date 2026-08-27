import { describe, expect, it } from "vitest";
import { colorForTag } from "./tag-colors";

describe("colorForTag", () => {
  it("is deterministic — the same name always gets the same color", () => {
    expect(colorForTag("Wedding")).toEqual(colorForTag("Wedding"));
  });

  it("returns a complete color set with bg, text, and dot classes", () => {
    const color = colorForTag("Budget");
    expect(color.bg).toMatch(/^bg-/);
    expect(color.text).toMatch(/^text-/);
    expect(color.dot).toMatch(/^bg-/);
  });

  it("distributes different names across more than one color", () => {
    const names = ["Wedding", "Budget", "Travel", "Work", "Personal", "Ideas", "Planning", "Finance"];
    const uniqueColors = new Set(names.map((name) => colorForTag(name).bg));
    expect(uniqueColors.size).toBeGreaterThan(1);
  });
});
