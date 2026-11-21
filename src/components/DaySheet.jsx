import { useEffect, useState } from "react";
import Sheet from "./Sheet.jsx";
import { saveDay, deleteDay } from "../lib/db.js";
import { addDays, todayISO } from "../lib/dates.js";

// Places are typed one per line; a line ending in ":" starts a heading ("Morning:").
export function parseGroups(text) {
  const groups = [];
  let cur = null;
  for (const raw of text.split("\n")) {
    const line = raw.trim();
    if (!line) continue;
    if (line.endsWith(":")) {
      cur = { h: line.slice(0, -1).trim(), items: [] };
      groups.push(cur);
    } else {
      if (!cur) { cur = { h: "Places", items: [] }; groups.push(cur); }
      cur.items.push(line.replace(/^[-•*]\s*/, ""));
    }
  }
  return groups.filter((g) => g.items.length);
}

const groupsToText = (groups = []) => groups.map((g) => `${g.h}:\n${(g.items || []).join("\n")}`).join("\n\n");
export default function DaySheet({ trip, days, day, onClose }) {
  const lastDate = days.map((d) => d.date).filter(Boolean).sort().pop();
  const [date, setDate] = useState(day?.date || (lastDate ? addDays(lastDate, 1) : trip.startDate || todayISO()));
  const [title, setTitle] = useState(day?.title || "");
  const [route, setRoute] = useState(day?.route || "");
  const [stay, setStay] = useState(day?.stay || "");
  const [nostay, setNostay] = useState(day?.nostay || "");
  const [badge, setBadge] = useState(day?.badge || "");
  const [places, setPlaces] = useState(groupsToText(day?.groups));
  const [note, setNote] = useState(day?.note || "");
  const [err, setErr] = useState("");
  const [saving, setSaving] = useState(false);
  const [armed, setArmed] = useState(false);

  useEffect(() => {
    if (!armed) return;
    const t = setTimeout(() => setArmed(false), 3000);
    return () => clearTimeout(t);
  }, [armed]);

  const submit = async (e) => {
    e.preventDefault();
    const t = title.trim();
    if (!t) return setErr("Give the day a title, e.g. “Kochi → Munnar”.");
    setSaving(true);
    try {
      await saveDay(trip.id, day?._id, {
        date, title: t, route: route.trim(), stay: stay.trim(), nostay: nostay.trim(),
        badge: badge.trim(), note: note.trim(), groups: parseGroups(places),
        createdAt: day?.createdAt || Date.now(),
      });
      onClose();
    } catch {
      setErr("Couldn't save — please try again.");
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!armed) return setArmed(true);
    try { await deleteDay(trip.id, day._id); onClose(); }
    catch { setErr("Couldn't delete — please try again."); }
  };

  return (
    <Sheet as="form" title={day ? "Edit day" : "Add day"} onClose={onClose} onSubmit={submit}>
      <div className="two">
        <div className="f">
          <label htmlFor="d-date">Date</label>
          <input id="d-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
        <div className="f">
          <label htmlFor="d-route">Travel</label>
          <input id="d-route" value={route} maxLength={120} placeholder="e.g. ~4 hrs drive" onChange={(e) => setRoute(e.target.value)} />
        </div>
      </div>
      <div className="f">
        <label htmlFor="d-title">Title</label>
        <input id="d-title" value={title} maxLength={120} placeholder="e.g. Kochi → Munnar" onChange={(e) => setTitle(e.target.value)} />
      </div>
      <div className="two">
        <div className="f">
          <label htmlFor="d-stay">Stay tonight</label>
          <input id="d-stay" value={stay} maxLength={80} placeholder="e.g. Munnar · 2 nights" onChange={(e) => setStay(e.target.value)} />
        </div>
        <div className="f">
          <label htmlFor="d-nostay">Passing through</label>
          <input id="d-nostay" value={nostay} maxLength={80} placeholder="e.g. Alappuzha · no hotel" onChange={(e) => setNostay(e.target.value)} />
        </div>
      </div>
      <div className="f">
        <label htmlFor="d-places">Places to see (one per line; “Morning:” starts a heading)</label>
        <textarea id="d-places" rows={7} value={places} onChange={(e) => setPlaces(e.target.value)}
          placeholder={"Morning:\nSunrise point\nTea museum\nEvening:\nSunset view point"} />
      </div>
      <div className="two">
        <div className="f">
          <label htmlFor="d-badge">Highlight</label>
          <input id="d-badge" value={badge} maxLength={60} placeholder="e.g. 🎉 New Year's Eve" onChange={(e) => setBadge(e.target.value)} />
        </div>
        <div className="f">
          <label htmlFor="d-note">Tip</label>
          <input id="d-note" value={note} maxLength={160} placeholder="e.g. Book tickets in advance" onChange={(e) => setNote(e.target.value)} />
        </div>
      </div>
      <div className="err">{err}</div>
      <div className="actions">
        <button type="button" className="btn ghost" onClick={onClose}>Cancel</button>
        <button type="submit" className="btn" disabled={saving}>{saving ? "Saving…" : "Save"}</button>
      </div>
      {day && (
        <div className="actions">
          <button type="button" className="btn danger" onClick={remove}>{armed ? "Tap again to delete" : "Delete day"}</button>
        </div>
      )}
    </Sheet>
  );
}
