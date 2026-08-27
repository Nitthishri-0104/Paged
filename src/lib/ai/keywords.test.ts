import { describe, expect, it } from "vitest";
import { extractKeywords } from "./keywords";

describe("extractKeywords", () => {
  it("ranks the most frequent meaningful words first", () => {
    const text = "wedding wedding wedding budget budget planning";
    expect(extractKeywords(text, 3)).toEqual(["Wedding", "Budget", "Planning"]);
  });

  it("filters out common stopwords", () => {
    const text = "the quick brown fox and the lazy dog";
    const keywords = extractKeywords(text, 10);
    expect(keywords).not.toContain("The");
    expect(keywords).not.toContain("And");
    expect(keywords).toContain("Quick");
  });

  it("ignores short tokens and pure numbers", () => {
    const text = "12345 ab report report report";
    const keywords = extractKeywords(text, 10);
    expect(keywords).not.toContain("12345");
    expect(keywords).not.toContain("Ab");
    expect(keywords).toContain("Report");
  });

  it("respects the requested limit", () => {
    const text = "alpha beta gamma delta epsilon";
    expect(extractKeywords(text, 2)).toHaveLength(2);
  });

  it("returns an empty array for text with no meaningful words", () => {
    expect(extractKeywords("the a an of to", 3)).toEqual([]);
  });
});
