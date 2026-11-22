// Move a trip to a new, unguessable link, for when its link has reached people outside the group.
// Copies the trip document plus its expenses, days and checklist to a new id. The old trip is left
// untouched; afterwards add its id to retired() in firestore.rules and publish the rules so the old
// link stops working.
//
//   node scripts/move-trip.mjs <trip-id> --dry-run   show what would be copied (reads only)
//   node scripts/move-trip.mjs <trip-id>             copy it and print the new link
//
// The new link is only printed, never written to a file: this repo and the built site are public.
import { initializeApp } from "firebase/app";
import { initializeFirestore, doc, getDoc, getDocs, collection, writeBatch, terminate } from "firebase/firestore";
import { firebaseConfig } from "../src/firebase-config.js";
import { newTripId } from "../src/trips/index.js";

const SITE = "https://himanshupsingh-dev.github.io/pocket_trip_planner/";
const SUBS = ["expenses", "days", "checklist"];
const BATCH = 450; // Firestore allows 500 writes per batch

const [oldId, flag] = process.argv.slice(2);
if (!oldId || (flag && flag !== "--dry-run")) {
  console.error("Usage: node scripts/move-trip.mjs <trip-id> [--dry-run]");
  process.exit(1);
}

const db = initializeFirestore(initializeApp(firebaseConfig), { ignoreUndefinedProperties: true });

async function readTrip(id) {
  const snap = await getDoc(doc(db, "trips", id));
  if (!snap.exists()) return null;
  const lists = {};
  for (const name of SUBS) lists[name] = (await getDocs(collection(db, "trips", id, name))).docs;
  return { data: snap.data(), lists };
}

const counts = (t) => SUBS.map((n) => `${n}: ${t.lists[n].length}`).join(", ");

try {
  const old = await readTrip(oldId);
  if (!old) throw new Error(`No trip with id "${oldId}".`);
  console.log(`"${old.data.title}" (${oldId})`);
  console.log(`  members: ${(old.data.members || []).map((m) => m.name).join(", ")}`);
  console.log(`  ${counts(old)}`);

  if (flag === "--dry-run") {
    console.log("Dry run: nothing was written.");
  } else {
    const newId = newTripId(old.data.title);
    const writes = [[doc(db, "trips", newId), old.data]];
    for (const name of SUBS) {
      for (const d of old.lists[name]) writes.push([doc(db, "trips", newId, name, d.id), d.data()]);
    }
    for (let i = 0; i < writes.length; i += BATCH) {
      const b = writeBatch(db);
      writes.slice(i, i + BATCH).forEach(([ref, body]) => b.set(ref, body));
      await b.commit();
    }

    const copy = await readTrip(newId);
    if (!copy || counts(copy) !== counts(old)) throw new Error(`Copy to "${newId}" doesn't match; check it before using it.`);
    console.log(`Copied and checked (${counts(copy)}).`);
    console.log(`\nNew private link. Send it only to the group, and don't save it in this repo:\n${SITE}#/${newId}/plan\n`);
    console.log(`Next: add '${oldId}' to retired() in firestore.rules, then publish the rules in the Firebase console.`);
  }
} catch (e) {
  console.error("Failed:", e?.message || e);
  process.exitCode = 1;
} finally {
  await terminate(db);
}
