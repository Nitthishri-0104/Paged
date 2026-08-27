import { describe, expect, it } from "vitest";
import { htmlToText } from "./html-to-text";

describe("htmlToText", () => {
  it("strips tags but keeps the text", () => {
    expect(htmlToText("<p>Hello <strong>world</strong></p>")).toBe("Hello world");
  });

  it("turns block boundaries and <br> into line breaks", () => {
    expect(htmlToText("<p>Line one</p><p>Line two</p>")).toBe("Line one\nLine two");
    expect(htmlToText("Line one<br>Line two")).toBe("Line one\nLine two");
  });

  it("decodes common HTML entities", () => {
    expect(htmlToText("Milk &amp; eggs&nbsp;&mdash;&nbsp;buy today")).toContain("Milk & eggs");
  });

  it("collapses excessive blank lines", () => {
    const result = htmlToText("<p>A</p><p></p><p></p><p>B</p>");
    expect(result).not.toMatch(/\n{3,}/);
  });

  it("passes plain text through unchanged", () => {
    expect(htmlToText("just plain text")).toBe("just plain text");
  });
});
