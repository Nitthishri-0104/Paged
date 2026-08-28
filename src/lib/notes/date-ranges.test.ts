import { describe, expect, it } from "vitest";
import { formatDateFilterLabel, resolveDateRange, validateCustomRange } from "./date-ranges";

// A fixed "now" makes every boundary deterministic. 2026-08-28 is a Friday,
// so its Monday-start week runs 2026-08-24 (Mon) through 2026-08-30 (Sun).
const FRIDAY = new Date(2026, 7, 28, 15, 30, 0); // Aug 28 2026, 3:30pm local

function iso(year: number, month: number, day: number, hour = 0, minute = 0, second = 0, ms = 0): Date {
  return new Date(year, month - 1, day, hour, minute, second, ms);
}

describe("resolveDateRange", () => {
  it("today: local midnight to 23:59:59.999, regardless of the current time of day", () => {
    const range = resolveDateRange("today", FRIDAY);
    expect(range).toEqual({ from: iso(2026, 8, 28, 0, 0, 0, 0), to: iso(2026, 8, 28, 23, 59, 59, 999) });
  });

  it("yesterday: the calendar day before today", () => {
    const range = resolveDateRange("yesterday", FRIDAY);
    expect(range).toEqual({ from: iso(2026, 8, 27, 0, 0, 0, 0), to: iso(2026, 8, 27, 23, 59, 59, 999) });
  });

  it("thisWeek: Monday through Sunday of the current week", () => {
    const range = resolveDateRange("thisWeek", FRIDAY);
    expect(range).toEqual({ from: iso(2026, 8, 24, 0, 0, 0, 0), to: iso(2026, 8, 30, 23, 59, 59, 999) });
  });

  it("thisWeek: a Monday itself is the start of its own week (no off-by-one)", () => {
    const monday = iso(2026, 8, 24, 9, 0, 0);
    const range = resolveDateRange("thisWeek", monday);
    expect(range).toEqual({ from: iso(2026, 8, 24, 0, 0, 0, 0), to: iso(2026, 8, 30, 23, 59, 59, 999) });
  });

  it("thisWeek: a Sunday itself is the end of its own week (no off-by-one)", () => {
    const sunday = iso(2026, 8, 30, 23, 0, 0);
    const range = resolveDateRange("thisWeek", sunday);
    expect(range).toEqual({ from: iso(2026, 8, 24, 0, 0, 0, 0), to: iso(2026, 8, 30, 23, 59, 59, 999) });
  });

  it("lastWeek: the full Monday-Sunday week before the current one", () => {
    const range = resolveDateRange("lastWeek", FRIDAY);
    expect(range).toEqual({ from: iso(2026, 8, 17, 0, 0, 0, 0), to: iso(2026, 8, 23, 23, 59, 59, 999) });
  });

  it("thisWeek: correctly spans a December -> January year boundary", () => {
    const range = resolveDateRange("thisWeek", iso(2026, 12, 31, 12, 0, 0));
    expect(range).toEqual({ from: iso(2026, 12, 28, 0, 0, 0, 0), to: iso(2027, 1, 3, 23, 59, 59, 999) });
  });

  it("thisMonth: the 1st through the last day of the current month", () => {
    const range = resolveDateRange("thisMonth", FRIDAY);
    expect(range).toEqual({ from: iso(2026, 8, 1, 0, 0, 0, 0), to: iso(2026, 8, 31, 23, 59, 59, 999) });
  });

  it("thisMonth: handles a 30-day month correctly", () => {
    const range = resolveDateRange("thisMonth", iso(2026, 9, 15, 0, 0, 0));
    expect(range?.to).toEqual(iso(2026, 9, 30, 23, 59, 59, 999));
  });

  it("thisMonth: handles February in a non-leap year correctly", () => {
    const range = resolveDateRange("thisMonth", iso(2026, 2, 10, 0, 0, 0));
    expect(range?.to).toEqual(iso(2026, 2, 28, 23, 59, 59, 999));
  });

  it("thisMonth: handles February in a leap year correctly", () => {
    const range = resolveDateRange("thisMonth", iso(2028, 2, 10, 0, 0, 0));
    expect(range?.to).toEqual(iso(2028, 2, 29, 23, 59, 59, 999));
  });

  it("lastMonth: the previous calendar month", () => {
    const range = resolveDateRange("lastMonth", FRIDAY);
    expect(range).toEqual({ from: iso(2026, 7, 1, 0, 0, 0, 0), to: iso(2026, 7, 31, 23, 59, 59, 999) });
  });

  it("lastMonth: rolls over the December -> January year boundary", () => {
    const range = resolveDateRange("lastMonth", iso(2027, 1, 15, 0, 0, 0));
    expect(range).toEqual({ from: iso(2026, 12, 1, 0, 0, 0, 0), to: iso(2026, 12, 31, 23, 59, 59, 999) });
  });

  it("custom: both sides given returns an inclusive local-day range", () => {
    const range = resolveDateRange("custom", FRIDAY, { from: "2026-08-01", to: "2026-08-15" });
    expect(range).toEqual({ from: iso(2026, 8, 1, 0, 0, 0, 0), to: iso(2026, 8, 15, 23, 59, 59, 999) });
  });

  it("custom: only a start date given leaves the end open", () => {
    const range = resolveDateRange("custom", FRIDAY, { from: "2026-08-01" });
    expect(range).toEqual({ from: iso(2026, 8, 1, 0, 0, 0, 0), to: undefined });
  });

  it("custom: only an end date given leaves the start open", () => {
    const range = resolveDateRange("custom", FRIDAY, { to: "2026-08-15" });
    expect(range).toEqual({ from: undefined, to: iso(2026, 8, 15, 23, 59, 59, 999) });
  });

  it("custom: neither date given resolves to null (nothing to filter by yet)", () => {
    expect(resolveDateRange("custom", FRIDAY, {})).toBeNull();
    expect(resolveDateRange("custom", FRIDAY, undefined)).toBeNull();
  });
});

describe("validateCustomRange", () => {
  it("accepts a valid from <= to range", () => {
    expect(validateCustomRange({ from: "2026-08-01", to: "2026-08-15" })).toBeNull();
  });

  it("accepts identical from and to (a single-day range)", () => {
    expect(validateCustomRange({ from: "2026-08-01", to: "2026-08-01" })).toBeNull();
  });

  it("accepts either side alone", () => {
    expect(validateCustomRange({ from: "2026-08-01" })).toBeNull();
    expect(validateCustomRange({ to: "2026-08-01" })).toBeNull();
  });

  it("rejects a start date after the end date", () => {
    expect(validateCustomRange({ from: "2026-08-15", to: "2026-08-01" })).toMatch(/on or before/);
  });

  it("rejects an empty range", () => {
    expect(validateCustomRange({})).toMatch(/select/i);
  });
});

describe("formatDateFilterLabel", () => {
  it("uses the preset's own label for non-custom presets", () => {
    expect(formatDateFilterLabel("today", { from: FRIDAY, to: FRIDAY })).toBe("Today");
    expect(formatDateFilterLabel("thisMonth", { from: FRIDAY, to: FRIDAY })).toBe("This month");
  });

  it("formats a custom range with both sides as a short date range", () => {
    const range = resolveDateRange("custom", FRIDAY, { from: "2026-08-01", to: "2026-08-15" })!;
    expect(formatDateFilterLabel("custom", range)).toBe("Aug 1 – Aug 15");
  });

  it("formats an open-ended custom range", () => {
    const fromOnly = resolveDateRange("custom", FRIDAY, { from: "2026-08-01" })!;
    expect(formatDateFilterLabel("custom", fromOnly)).toBe("From Aug 1");

    const toOnly = resolveDateRange("custom", FRIDAY, { to: "2026-08-15" })!;
    expect(formatDateFilterLabel("custom", toOnly)).toBe("Until Aug 15");
  });
});
