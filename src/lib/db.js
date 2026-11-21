import { initializeApp } from "firebase/app";
import {
  initializeFirestore, collection, doc, onSnapshot, addDoc, setDoc, deleteDoc, writeBatch,
} from "firebase/firestore";
import { firebaseConfig } from "../firebase-config.js";
import { templateDoc } from "../trips/index.js";

export const isConfigured =
  !!firebaseConfig?.apiKey && !/PASTE/.test(firebaseConfig.apiKey);

const fs = isConfigured
  ? initializeFirestore(initializeApp(firebaseConfig), { ignoreUndefinedProperties: true })
  : null;

// Layout: trips/{tripId}                 → title, dates, members, budget, estimates, …
//         trips/{tripId}/expenses/{id}   → one expense
//         trips/{tripId}/days/{id}       → one itinerary day
const tripRef = (id) => doc(fs, "trips", id);
const sub = (id, name) => collection(fs, "trips", id, name);

/** Calls onData(fields) when the trip exists, onData(null) once the server confirms it doesn't. */
export function watchTrip(id, onData, onError) {
  return onSnapshot(tripRef(id), { includeMetadataChanges: true }, (s) => {
    if (s.exists()) onData(s.data());
    else if (!s.metadata.fromCache) onData(null);
  }, onError);
}

/** Live list of a trip's "expenses" or "days". */
export function watchList(id, name, onData, onError) {
  return onSnapshot(
    sub(id, name),
    { includeMetadataChanges: true },
    (snap) => onData(snap.docs.map((d) => ({ _id: d.id, ...d.data() })), snap.metadata.fromCache),
    onError
  );
}

export const createTrip = (id, fields) => setDoc(tripRef(id), { ...fields, createdAt: Date.now() });
export const updateTrip = (id, fields) => setDoc(tripRef(id), fields, { merge: true });

export const saveExpense = (tripId, id, body) =>
  id ? setDoc(doc(sub(tripId, "expenses"), id), body) : addDoc(sub(tripId, "expenses"), body);
export const deleteExpense = (tripId, id) => deleteDoc(doc(sub(tripId, "expenses"), id));

export const saveDay = (tripId, id, body) =>
  id ? setDoc(doc(sub(tripId, "days"), id), body) : addDoc(sub(tripId, "days"), body);
export const deleteDay = (tripId, id) => deleteDoc(doc(sub(tripId, "days"), id));

/** First visit to a built-in trip: copy the template (trip, days, seed expenses) in one go. */
export async function seedTrip(t) {
  const b = writeBatch(fs);
  b.set(tripRef(t.id), { ...templateDoc(t), createdAt: Date.now() });
  (t.days || []).forEach((d, i) => b.set(doc(sub(t.id, "days"), "day-" + (i + 1)), { ...d, createdAt: i + 1 }));
  const all = t.members.map((m) => m.id);
  (t.seedExpenses || []).forEach((e, i) =>
    b.set(doc(sub(t.id, "expenses"), e.id), {
      desc: e.desc, amount: 0, date: e.date || "", category: e.category || "Other",
      place: e.place || "", paidBy: "", split: all, createdAt: i + 1,
    })
  );
  await b.commit();
}
