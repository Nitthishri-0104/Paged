import { describe, expect, it } from "vitest";
import { formatRelativeTime } from "./format";

describe("formatRelativeTime", () => {
  const now = new Date("2026-01-15T12:00:00.000Z");

  it("shows 'just now' for anything under 10 seconds ago", () => {
    const fiveSecondsAgo = new Date(now.getTime() - 5000).toISOString();
    expect(formatRelativeTime(fiveSecondsAgo, now)).toBe("just now");
  });

  it("formats minutes, hours, and days ago", () => {
    expect(formatRelativeTime(new Date(now.getTime() - 5 * 60_000).toISOString(), now)).toBe("5 minutes ago");
    expect(formatRelativeTime(new Date(now.getTime() - 3 * 3_600_000).toISOString(), now)).toBe("3 hours ago");
    expect(formatRelativeTime(new Date(now.getTime() - 2 * 86_400_000).toISOString(), now)).toBe("2 days ago");
  });

  it("falls back to years for very old dates", () => {
    const twoYearsAgo = new Date(now.getTime() - 2 * 365.25 * 86_400_000).toISOString();
    expect(formatRelativeTime(twoYearsAgo, now)).toBe("2 years ago");
  });
});
