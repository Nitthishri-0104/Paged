import { describe, expect, it } from "vitest";
import { colorForTag, isTagColorKey, TAG_COLOR_PRESETS } from "./tag-colors";

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

  it("uses the persisted color key when given one, regardless of name hash", () => {
    const color = colorForTag("Anything", "orange");
    expect(color.key).toBe("orange");
  });

  it("falls back to the hash-based color for an unrecognized key", () => {
    const withBadKey = colorForTag("Wedding", "not-a-real-color");
    const withNoKey = colorForTag("Wedding");
    expect(withBadKey).toEqual(withNoKey);
  });
});

describe("isTagColorKey", () => {
  it("accepts every preset key", () => {
    for (const preset of TAG_COLOR_PRESETS) {
      expect(isTagColorKey(preset.key)).toBe(true);
    }
  });

  it("rejects an unknown key", () => {
    expect(isTagColorKey("chartreuse")).toBe(false);
  });
});
