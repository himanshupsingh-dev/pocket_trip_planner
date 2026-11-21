// Dates are stored as "YYYY-MM-DD" strings.
const local = (iso) => new Date(iso + "T00:00");
const utc = (iso) => { const [y, m, d] = iso.split("-").map(Number); return Date.UTC(y, m - 1, d); };

/** "2026-12-25" → "Fri, 25 Dec" */
export const fmtDay = (iso) =>
  iso ? local(iso).toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" }) : "";

/** "2026-12-25" → "25 Dec 2026" */
export const fmtDate = (iso) =>
  iso ? local(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "";

/** Inclusive number of days between two dates (0 if either is missing). */
export const dayCount = (a, b) => (a && b && b >= a ? Math.round((utc(b) - utc(a)) / 864e5) + 1 : 0);

export function fmtRange(a, b) {
  if (!a) return "";
  const n = dayCount(a, b);
  return `${fmtDate(a)}${b && b !== a ? " – " + fmtDate(b) : ""}${n ? ` · ${n} ${n === 1 ? "day" : "days"}` : ""}`;
}

export const addDays = (iso, n) => new Date(utc(iso) + n * 864e5).toISOString().slice(0, 10);
