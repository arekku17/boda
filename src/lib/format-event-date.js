export const EVENT_TIME_ZONE = "America/Mexico_City";

/**
 * Formats a date string in Spanish (Mexico)
 * @param {string} isoString - "YYYY-MM-DD" or a full ISO date string
 * @param {('full'|'short'|'time')} [format='full'] - The format type to use
 * @returns {string} The formatted date string in Spanish
 *
 * @example
 * // returns "Sábado, 17 de octubre de 2026"
 * formatEventDate("2026-10-17", "full")
 *
 * // returns "17 de octubre de 2026"
 * formatEventDate("2026-10-17", "short")
 */
export const formatEventDate = (isoString, format = "full") => {
  if (!isoString) return "";

  const date = new Date(isoString);
  // Date-only strings are parsed as UTC midnight; format them in UTC so the
  // day doesn't shift back when converted to Mexico's time zone.
  const isDateOnly = /^\d{4}-\d{2}-\d{2}$/.test(isoString);
  const timeZone = isDateOnly ? "UTC" : EVENT_TIME_ZONE;

  if (format === "time") {
    return date.toLocaleTimeString("es-MX", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
      timeZone,
    });
  }

  const formats = {
    full: { weekday: "long", year: "numeric", month: "long", day: "numeric" },
    short: { day: "numeric", month: "long", year: "numeric" },
  };

  const formatted = date.toLocaleDateString("es-MX", {
    ...formats[format],
    timeZone,
  });

  return formatted.charAt(0).toUpperCase() + formatted.slice(1);
};

/**
 * Converts a 24h "HH:MM" time into "h:MM AM/PM"
 * @param {string} time - Time in "HH:MM" format
 * @returns {string}
 *
 * @example
 * // returns "3:00 PM"
 * formatTime12h("15:00")
 */
export const formatTime12h = (time) => {
  if (!time) return "";
  const [hours, minutes] = time.split(":").map(Number);
  const suffix = hours >= 12 ? "PM" : "AM";
  return `${hours % 12 || 12}:${String(minutes).padStart(2, "0")} ${suffix}`;
};
