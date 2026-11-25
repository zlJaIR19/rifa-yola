const TIME_ZONE = "America/Lima";
const LOCALE = "es-PE";

const dateTimeFormatter = new Intl.DateTimeFormat(LOCALE, {
  timeZone: TIME_ZONE,
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hour12: true,
});

const dateFormatter = new Intl.DateTimeFormat(LOCALE, {
  timeZone: TIME_ZONE,
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

/**
 * Parse Postgres timestamps in any of the formats Supabase returns
 * ("2026-11-25T20:59:00.123456+00:00", "2026-11-25 20:59:00.123456+00"), Safari-safe.
 */
export function parseTimestamp(value: string | null | undefined): number {
  if (!value) return NaN;
  const iso = value
    .trim()
    .replace(" ", "T")
    .replace(/(\.\d{3})\d+/, "$1")
    .replace(/([+-]\d{2})$/, "$1:00")
    .replace(/([+-]\d{2})(\d{2})$/, "$1:$2");
  return Date.parse(iso);
}

/** "25/11/2026, 03:59 p. m." in Lima time. */
export function formatDateTime(value: string | Date | null | undefined): string {
  if (!value) return "";
  const d = typeof value === "string" ? new Date(parseTimestamp(value)) : value;
  if (Number.isNaN(d.getTime())) return "";
  return dateTimeFormatter.format(d);
}

/** "25/11/2026" in Lima time. */
export function formatDate(value: string | Date | null | undefined): string {
  if (!value) return "";
  const d = typeof value === "string" ? new Date(parseTimestamp(value)) : value;
  if (Number.isNaN(d.getTime())) return "";
  return dateFormatter.format(d);
}
