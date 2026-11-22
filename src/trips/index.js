// Trips live in the database and are created in the app (＋ New trip).
// Built-in templates below are copied into the database the first time someone opens them.
// A template's id is public (it's in the built site and listed on everyone's home page), so
// never use one for a real group trip — real trips need an unguessable id from newTripId().
import { round2, toPaise } from "../lib/money.js";

const TEMPLATES = [];

export const getTemplate = (id) => TEMPLATES.find((t) => t.id === id) || null;
export const templateList = () => TEMPLATES;

/** Categories for trips that don't define their own. */
export const DEFAULT_CATEGORIES = [
  { name: "Hotel", icon: "🏨" }, { name: "Transport", icon: "🚌" }, { name: "Fuel", icon: "⛽" },
  { name: "Food", icon: "🍛" }, { name: "Activity", icon: "🎟️" }, { name: "Shopping", icon: "🛍️" },
  { name: "Other", icon: "📌" },
];

const cleanMembers = (l) =>
  Array.isArray(l)
    ? l.map((m, i) => ({ id: String(m?.id || "m" + (i + 1)), name: String(m?.name || "Someone") }))
    : [];

/** Database (or template) fields → the trip object every screen uses. */
export function normalizeTrip(id, d = {}) {
  const cats = Array.isArray(d.categories) && d.categories.length ? d.categories : DEFAULT_CATEGORIES;
  const places = Array.isArray(d.places) && d.places.length ? d.places.map(String) : ["On the way"];
  const est = d.estimates && typeof d.estimates === "object" ? d.estimates : {};
  const cleanEstimates = Object.fromEntries(Object.entries(est).map(([k, v]) => [k, Math.max(0, round2(v))]));
  const estimatedSumP = Object.values(cleanEstimates).reduce((a, b) => a + toPaise(b), 0);
  const budget = estimatedSumP > 0 ? estimatedSumP / 100 : Math.max(0, round2(d.budget));
  return {
    id,
    title: String(d.title || "Untitled trip"),
    emoji: String(d.emoji || "🧳"),
    subtitle: String(d.subtitle || ""),
    startDate: d.startDate || "",
    endDate: d.endDate || "",
    budget,
    estimates: cleanEstimates,
    members: cleanMembers(d.members),
    categories: Object.fromEntries(cats.map((c) => [String(c.name), String(c.icon || "📌")])),
    places,
    defaultPlace: places.includes(d.defaultPlace) ? d.defaultPlace : places[0],
    planNote: String(d.planNote || ""),
    checklist: Array.isArray(d.checklist) ? d.checklist : [],
  };
}

/** The trip document written to the database when a template is first opened. */
export const templateDoc = (t) => ({
  title: t.title, emoji: t.emoji, subtitle: t.subtitle || "",
  startDate: t.startDate || "", endDate: t.endDate || "",
  budget: t.budget || 0, estimates: t.estimates || {},
  members: t.members, categories: t.categories || DEFAULT_CATEGORIES,
  places: t.places || [], defaultPlace: t.defaultPlace || "", planNote: t.planNote || "",
  checklist: t.checklist || [],
});

export const templateDays = (t) => (t.days || []).map((d, i) => ({ _id: "day-" + (i + 1), createdAt: i + 1, ...d }));

const rand = (n) => {
  const a = new Uint8Array(n);
  crypto.getRandomValues(a);
  return Array.from(a, (x) => "abcdefghijkmnpqrstuvwxyz23456789"[x % 32]).join("");
};

/** Unguessable trip id, e.g. "goa-weekend-k3x9p2q7mw" — the link is the key to the trip. */
export function newTripId(title) {
  const slug = title.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 30);
  return (slug || "trip") + "-" + rand(10);
}

export const newMemberId = () => "m" + rand(6);
