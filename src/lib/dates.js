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

/** Today on this device as "YYYY-MM-DD" — local time, so it doesn't lag a day behind in India before 5:30 am. */
export function todayISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** Where a trip stands relative to today: { cls, text }, or null when it has no start date. */
export function tripStatus(start, end, today = todayISO()) {
  if (!start) return null;
  const last = end && end >= start ? end : start;
  if (today < start) {
    const n = dayCount(today, start) - 1;
    return { cls: "soon", text: n === 1 ? "Starts tomorrow" : `Starts in ${n} days` };
  }
  if (today <= last) return { cls: "now", text: `On now · Day ${dayCount(start, today)}` };
  return { cls: "done", text: "Finished" };
}
