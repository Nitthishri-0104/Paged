const UNITS: { limit: number; divisor: number; unit: Intl.RelativeTimeFormatUnit }[] = [
  { limit: 60, divisor: 1, unit: "second" },
  { limit: 3600, divisor: 60, unit: "minute" },
  { limit: 86_400, divisor: 3600, unit: "hour" },
  { limit: 604_800, divisor: 86_400, unit: "day" },
  { limit: 2_629_800, divisor: 604_800, unit: "week" },
  { limit: 31_557_600, divisor: 2_629_800, unit: "month" },
];

const relativeTimeFormatter = new Intl.RelativeTimeFormat("en", { numeric: "auto" });

/** Formats an ISO timestamp as "just now" / "5 minutes ago" / "3 days ago". */
export function formatRelativeTime(isoDate: string, now: Date = new Date()): string {
  const then = new Date(isoDate);
  const diffSeconds = Math.round((now.getTime() - then.getTime()) / 1000);

  if (diffSeconds < 10) {
    return "just now";
  }

  for (const { limit, divisor, unit } of UNITS) {
    if (diffSeconds < limit) {
      return relativeTimeFormatter.format(-Math.round(diffSeconds / divisor), unit);
    }
  }

  const years = Math.round(diffSeconds / 31_557_600);
  return relativeTimeFormatter.format(-years, "year");
}
