// Things remembered on this device only (never shared): which trips you've opened, who you are in each, default name, and dev mode.
const TRIPS_KEY = "ptp-trips";
const DEV_KEY = "ptp-dev-mode";
const USER_NAME_KEY = "ptp-user-name";
const meKey = (tripId) => "ptp-me:" + tripId;

const read = (k) => { try { return localStorage.getItem(k); } catch { return null; } };
const write = (k, v) => { try { localStorage.setItem(k, v); } catch { /* private mode etc. */ } };

/** Default user name on this device. */
export const getUserName = () => {
  try {
    return read(USER_NAME_KEY) || "";
  } catch {
    return "";
  }
};

export const setUserName = (name) => {
  write(USER_NAME_KEY, String(name || "").trim());
};

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

/** Developer mode state (default false / inactive). */
export const isDevMode = () => {
  try {
    return read(DEV_KEY) === "true";
  } catch {
    return false;
  }
};

export const setDevMode = (active) => {
  write(DEV_KEY, active ? "true" : "false");
  if (typeof window !== "undefined") {
    window.__DEV_MODE__ = !!active;
    window.dispatchEvent(new CustomEvent("ptp-dev-mode-change", { detail: !!active }));
  }
};

export const checkDevPassword = (pw) => {
  const p = String(pw || "").trim();
  return p === "cocotoco";
};

if (typeof window !== "undefined") {
  window.__DEV_MODE__ = isDevMode();
}
