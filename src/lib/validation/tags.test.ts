import { describe, expect, it } from "vitest";
import { createTagSchema } from "./tags";

describe("createTagSchema", () => {
  it("defaults color to blue when omitted", () => {
    const result = createTagSchema.parse({ name: "Work" });
    expect(result).toEqual({ name: "Work", color: "blue" });
  });

  it("accepts any preset color key", () => {
    const result = createTagSchema.parse({ name: "Work", color: "orange" });
    expect(result.color).toBe("orange");
  });

  it("rejects a color that isn't one of the presets", () => {
    const result = createTagSchema.safeParse({ name: "Work", color: "chartreuse" });
    expect(result.success).toBe(false);
  });

  it("trims the name and rejects an empty one", () => {
    expect(createTagSchema.parse({ name: "  Work  " }).name).toBe("Work");
    expect(createTagSchema.safeParse({ name: "   " }).success).toBe(false);
  });
});
