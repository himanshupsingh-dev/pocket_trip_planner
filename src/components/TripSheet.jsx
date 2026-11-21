import { useState } from "react";
import Sheet from "./Sheet.jsx";
import { createTrip, updateTrip } from "../lib/db.js";
import { DEFAULT_CATEGORIES, newTripId, newMemberId } from "../trips/index.js";

const lines = (s) => s.split("\n").map((x) => x.trim()).filter(Boolean);

/** Create a trip (no `trip` prop) or edit an existing one: details, members, places. */
export default function TripSheet({ trip, expenses = [], onClose, onSaved }) {
  const isNew = !trip;
  const [emoji, setEmoji] = useState(trip?.emoji || "🧳");
  const [title, setTitle] = useState(trip?.title || "");
  const [subtitle, setSubtitle] = useState(trip?.subtitle || "");
  const [startDate, setStartDate] = useState(trip?.startDate || "");
  const [endDate, setEndDate] = useState(trip?.endDate || "");
  const [budget, setBudget] = useState("");
  const [members, setMembers] = useState(trip?.members || [{ id: "m1", name: "" }, { id: "m2", name: "" }]);
  const [places, setPlaces] = useState(trip ? trip.places.join("\n") : "");
  const [planNote, setPlanNote] = useState(trip?.planNote || "");
  const [err, setErr] = useState("");
  const [saving, setSaving] = useState(false);

  const existing = (id) => !!trip?.members.some((m) => m.id === id);
  const inUse = (id) =>
    expenses.some((e) => (Number(e.amount) || 0) > 0 && (e.paidBy === id || (e.split || []).includes(id)));

  const setName = (i, name) => setMembers(members.map((m, j) => (j === i ? { ...m, name } : m)));
  const [focusId, setFocusId] = useState(null);
  const addMember = () => {
    const id = newMemberId();
    setMembers([...members, { id, name: "" }]);
    setFocusId(id);
  };
  const removeMember = (i) => {
    const m = members[i];
    if (existing(m.id) && inUse(m.id))
      return setErr(`${m.name || "This member"} is part of some expenses, so they can't be removed. Change those expenses first.`);
    setErr("");
    setMembers(members.filter((_, j) => j !== i));
  };

  const submit = async (e) => {
    e.preventDefault();
    const t = title.trim();
    if (!t) return setErr("Give the trip a name.");
    if (startDate && endDate && endDate < startDate) return setErr("The end date is before the start date.");
    const list = members.map((m) => ({ id: m.id, name: m.name.trim() }));
    if (list.some((m) => !m.name && existing(m.id))) return setErr("Every member needs a name.");
    const named = list.filter((m) => m.name);
    if (!named.length) return setErr("Add at least one member.");
    const b = Number(budget) || 0;
    if (b < 0) return setErr("Budget can't be negative.");

    const placeList = lines(places);
    const fields = {
      emoji: emoji.trim() || "🧳", title: t, subtitle: subtitle.trim(), startDate, endDate,
      members: named, places: placeList.length ? placeList : ["On the way"],
    };
    setSaving(true);
    try {
      if (isNew) {
        const id = newTripId(t);
        await createTrip(id, { ...fields, budget: b, estimates: {}, categories: DEFAULT_CATEGORIES, planNote: "" });
        onSaved?.({ id, ...fields });
      } else {
        await updateTrip(trip.id, { ...fields, planNote: planNote.trim() });
        onClose();
      }
    } catch {
      setErr("Couldn't save — please try again.");
      setSaving(false);
    }
  };

  return (
    <Sheet as="form" onClose={onClose} onSubmit={submit}>
      <h2>{isNew ? "New trip ✨" : "Edit trip"}</h2>
      <div className="trow">
        <div className="f">
          <label htmlFor="t-emoji">Icon</label>
          <input id="t-emoji" value={emoji} maxLength={8} onChange={(e) => setEmoji(e.target.value)} />
        </div>
        <div className="f">
          <label htmlFor="t-title">Trip name</label>
          <input id="t-title" value={title} maxLength={80} placeholder="e.g. Goa Weekend"
            onChange={(e) => setTitle(e.target.value)} />
        </div>
      </div>
      <div className="f">
        <label htmlFor="t-sub">Short description</label>
        <input id="t-sub" value={subtitle} maxLength={80} placeholder="e.g. Mumbai ⇄ Goa · 5 friends"
          onChange={(e) => setSubtitle(e.target.value)} />
      </div>
      <div className="two">
        <div className="f">
          <label htmlFor="t-start">Start date</label>
          <input id="t-start" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
        </div>
        <div className="f">
          <label htmlFor="t-end">End date</label>
          <input id="t-end" type="date" value={endDate} min={startDate || undefined} onChange={(e) => setEndDate(e.target.value)} />
        </div>
      </div>
      {isNew && (
        <div className="f">
          <label htmlFor="t-budget">Total budget (₹)</label>
          <input id="t-budget" type="number" inputMode="numeric" min="0" step="1" value={budget}
            placeholder="Optional — you can set it later" onChange={(e) => setBudget(e.target.value)} />
        </div>
      )}
      <fieldset className="f">
        <legend>Members</legend>
        {members.map((m, i) => (
          <div className="mrow" key={m.id}>
            <input value={m.name} maxLength={30} placeholder={`Member ${i + 1}`} aria-label={`Member ${i + 1} name`}
              autoFocus={m.id === focusId} onChange={(e) => setName(i, e.target.value)} />
            <button type="button" className="x" onClick={() => removeMember(i)} aria-label={`Remove ${m.name || "member " + (i + 1)}`}>×</button>
          </div>
        ))}
        <button type="button" className="btn ghost small" onClick={addMember}>＋ Add member</button>
      </fieldset>
      <div className="f">
        <label htmlFor="t-places">Places (one per line, used to tag expenses)</label>
        <textarea id="t-places" rows={4} value={places} placeholder={"e.g.\nMumbai\nPanaji\nOn the way"}
          onChange={(e) => setPlaces(e.target.value)} />
      </div>
      {!isNew && (
        <div className="f">
          <label htmlFor="t-note">Note under the itinerary</label>
          <textarea id="t-note" rows={2} value={planNote} maxLength={300} onChange={(e) => setPlanNote(e.target.value)} />
        </div>
      )}
      {isNew && <p className="note">Once it's created, use <b>🔗 Invite</b> to send the trip link to its members.</p>}
      <div className="err">{err}</div>
      <div className="actions">
        <button type="button" className="btn ghost" onClick={onClose}>Cancel</button>
        <button type="submit" className="btn" disabled={saving}>
          {saving ? "Saving…" : isNew ? "Create trip" : "Save"}
        </button>
      </div>
    </Sheet>
  );
}
