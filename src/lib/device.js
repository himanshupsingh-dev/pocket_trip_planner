// Things remembered on this device only (never shared): which trips you've opened, and who you are in each.
const TRIPS_KEY = "ptp-trips";
const meKey = (tripId) => "ptp-me:" + tripId;

const read = (k) => { try { return localStorage.getItem(k); } catch { return null; } };
const write = (k, v) => { try { localStorage.setItem(k, v); } catch { /* private mode etc. */ } };

/** Trips created or opened on this device, most recent first. */
export function knownTrips() {
  try {
    const l = JSON.parse(read(TRIPS_KEY) || "[]");
    return Array.isArray(l) ? l.filter((t) => t && t.id) : [];
  } catch { return []; }
}

export function rememberTrip({ id, title, emoji, subtitle, startDate, endDate }) {
  const rest = knownTrips().filter((t) => t.id !== id);
  write(TRIPS_KEY, JSON.stringify([{ id, title, emoji, subtitle, startDate, endDate }, ...rest].slice(0, 50)));
}

export const getMe = (tripId) => read(meKey(tripId));
export const setMe = (tripId, memberId) => write(meKey(tripId), memberId);
