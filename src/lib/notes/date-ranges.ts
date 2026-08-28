export type DateFilterPreset = "today" | "yesterday" | "thisWeek" | "lastWeek" | "thisMonth" | "lastMonth" | "custom";

export const DATE_FILTER_PRESETS: { key: DateFilterPreset; label: string }[] = [
  { key: "today", label: "Today" },
  { key: "yesterday", label: "Yesterday" },
  { key: "thisWeek", label: "This week" },
  { key: "lastWeek", label: "Last week" },
  { key: "thisMonth", label: "This month" },
  { key: "lastMonth", label: "Last month" },
  { key: "custom", label: "Custom date" },
];

export interface CustomDateRange {
  from?: string; // "YYYY-MM-DD", from a native <input type="date">
  to?: string;
}

/** Either side may be omitted (an open-ended range) — both are Prisma `gte`/`lte` inputs, independently optional. */
export interface DateRange {
  from?: Date;
  to?: Date;
}

/** The currently-applied date filter, as shared between the popover, the notes list, and the app shell. */
export interface AppliedDateFilter {
  preset: DateFilterPreset;
  range: DateRange;
  /** Only set (and only meaningful) when `preset === "custom"` — lets the popover re-open pre-filled with the same values. */
  custom?: CustomDateRange;
}

// All boundaries are computed from the *local* calendar date (getFullYear/
// getMonth/getDate, not the UTC variants), specifically so "today" means
// today in the browser's own timezone — the same timezone the user is
// looking at a clock in. Building each boundary via the Date(y, m, d, ...)
// constructor (not string parsing, which Date treats as UTC) is what keeps
// this correct across timezones instead of shifting by a day at the edges.
function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0);
}

function endOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999);
}

// Weeks start Monday (ISO 8601 convention). getDay() is 0 (Sunday) .. 6
// (Saturday); `(day + 6) % 7` maps that to "days since Monday" (Monday -> 0,
// Sunday -> 6).
function startOfWeek(date: Date): Date {
  const daysSinceMonday = (date.getDay() + 6) % 7;
  return startOfDay(new Date(date.getFullYear(), date.getMonth(), date.getDate() - daysSinceMonday));
}

function endOfWeek(date: Date): Date {
  const start = startOfWeek(date);
  return endOfDay(new Date(start.getFullYear(), start.getMonth(), start.getDate() + 6));
}

function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1, 0, 0, 0, 0);
}

// Day 0 of "next month" is the last day of the current month — the Date
// constructor normalizes an out-of-range month (e.g. month 12 for December)
// into the correct following year automatically, so this also handles the
// December -> January rollover without any special-casing.
function endOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999);
}

/** Parses a native date input's "YYYY-MM-DD" value as a local calendar date (never UTC, which would shift the day near midnight in most timezones). */
function parseDateInputValue(value: string): Date {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
}

/**
 * Resolves a preset (or a custom range) into concrete `from`/`to` instants,
 * anchored to `now` (defaults to the real current time; tests pass a fixed
 * value so boundary math is deterministic). Returns `null` only for
 * `"custom"` with neither `from` nor `to` supplied — there's nothing to
 * filter by yet.
 */
export function resolveDateRange(
  preset: DateFilterPreset,
  now: Date = new Date(),
  custom?: CustomDateRange,
): DateRange | null {
  switch (preset) {
    case "today":
      return { from: startOfDay(now), to: endOfDay(now) };
    case "yesterday": {
      const yesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
      return { from: startOfDay(yesterday), to: endOfDay(yesterday) };
    }
    case "thisWeek":
      return { from: startOfWeek(now), to: endOfWeek(now) };
    case "lastWeek": {
      const anchor = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7);
      return { from: startOfWeek(anchor), to: endOfWeek(anchor) };
    }
    case "thisMonth":
      return { from: startOfMonth(now), to: endOfMonth(now) };
    case "lastMonth": {
      const anchor = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      return { from: startOfMonth(anchor), to: endOfMonth(anchor) };
    }
    case "custom": {
      if (!custom?.from && !custom?.to) return null;
      return {
        from: custom.from ? startOfDay(parseDateInputValue(custom.from)) : undefined,
        to: custom.to ? endOfDay(parseDateInputValue(custom.to)) : undefined,
      };
    }
  }
}

/** Validates a custom range before it's applied. Returns an error message, or null if the range is fine (including either side being empty). */
export function validateCustomRange(custom: CustomDateRange): string | null {
  if (!custom.from && !custom.to) {
    return "Select a start date, an end date, or both.";
  }
  if (custom.from && custom.to && parseDateInputValue(custom.from) > parseDateInputValue(custom.to)) {
    return "Start date must be on or before the end date.";
  }
  return null;
}

const DATE_LABEL_FORMAT: Intl.DateTimeFormatOptions = { month: "short", day: "numeric" };

/** A short, human-readable label for the active-filter chip, e.g. "Today" or "Aug 1 – Aug 15". */
export function formatDateFilterLabel(preset: DateFilterPreset, range: DateRange): string {
  if (preset !== "custom") {
    return DATE_FILTER_PRESETS.find((option) => option.key === preset)?.label ?? "Custom date";
  }
  const from = range.from?.toLocaleDateString(undefined, DATE_LABEL_FORMAT);
  const to = range.to?.toLocaleDateString(undefined, DATE_LABEL_FORMAT);
  if (from && to) return `${from} – ${to}`;
  if (from) return `From ${from}`;
  return `Until ${to}`;
}
