import { useEffect, useState } from "react";
import Sheet from "./Sheet.jsx";
import { saveExpense, deleteExpense } from "../lib/db.js";

const today = () => new Date().toISOString().slice(0, 10);

export default function ExpenseSheet({ trip, exp, me, members, nameOf, onClose }) {
  const CATS = trip.categories, PLACES = trip.places;
  const allIds = members.map((m) => m.id);
  const [desc, setDesc] = useState(exp?.desc || "");
  const [amount, setAmount] = useState(exp?.amount || "");
  const [date, setDate] = useState(exp?.date || today());
  const [category, setCategory] = useState(exp?.category || ("Food" in CATS ? "Food" : Object.keys(CATS)[0]));
  const [place, setPlace] = useState(exp?.place || trip.defaultPlace);
  // unfilled rows (e.g. seeded hotels) default to everyone currently on the trip
  const filled = exp && (Number(exp.amount) > 0 || exp.paidBy);
  const [split, setSplit] = useState(new Set(filled && Array.isArray(exp.split) ? exp.split : allIds));
  const [err, setErr] = useState("");
  const [saving, setSaving] = useState(false);
  const [armed, setArmed] = useState(false);

  useEffect(() => {
    if (!armed) return;
    const t = setTimeout(() => setArmed(false), 3000);
    return () => clearTimeout(t);
  }, [armed]);

  // keep the original payer when editing; unclaimed rows (e.g. hotels) become yours
  const payer = exp?.paidBy || me;
  const everyone = split.size === allIds.length;

  const toggle = (id) => {
    const s = new Set(split);
    s.has(id) ? s.delete(id) : s.add(id);
    setSplit(s);
  };

  const submit = async (e) => {
    e.preventDefault();
    const d = desc.trim(), a = Number(amount) || 0;
    if (!d) return setErr("Add a short description.");
    if (a < 0) return setErr("Amount can't be negative.");
    if (!payer) return setErr("Please choose who you are first before adding an expense.");
    if (!split.size) return setErr("Pick at least one person to split with.");
    setSaving(true);
    try {
      await saveExpense(trip.id, exp?._id, {
        desc: d, amount: a, date, category, place, paidBy: payer,
        split: allIds.filter((id) => split.has(id)),
        createdAt: exp?.createdAt || Date.now(),
      });
      onClose();
    } catch {
      setErr("Couldn't save — please try again.");
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!armed) return setArmed(true);
    try { await deleteExpense(trip.id, exp._id); onClose(); }
    catch { setErr("Couldn't delete — please try again."); }
  };

  return (
    <Sheet as="form" onClose={onClose} onSubmit={submit}>
      <h2>{exp ? "Edit expense" : "Add expense"}</h2>
      <div className="f">
        <label>What was it for?</label>
        <input value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="e.g. Dinner, fuel, tickets" maxLength={120} />
      </div>
      <div className="two">
        <div className="f">
          <label>Amount (₹)</label>
          <input type="number" inputMode="decimal" min="0" step="1" placeholder="0"
            value={amount} onChange={(e) => setAmount(e.target.value)} />
        </div>
        <div className="f">
          <label>Date</label>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
      </div>
      <div className="two">
        <div className="f">
          <label>Category</label>
          <select value={category} onChange={(e) => setCategory(e.target.value)}>
            {Object.keys(CATS).map((k) => <option key={k}>{k}</option>)}
          </select>
        </div>
        <div className="f">
          <label>Place</label>
          <select value={place} onChange={(e) => setPlace(e.target.value)}>
            {PLACES.map((p) => <option key={p}>{p}</option>)}
          </select>
        </div>
      </div>
      <div className="f">
        <label>Paid by</label>
        <div className="paidtxt">{payer === me ? `You (${nameOf(me)})` : nameOf(payer)}</div>
      </div>
      <div className="f">
        <label>Split between</label>
        <div className="chips">
          <span className={`chip ${everyone ? "on" : ""}`}
            onClick={() => setSplit(new Set(everyone ? [] : allIds))}>Everyone</span>
          {members.map((m) => (
            <span key={m.id} className={`chip ${split.has(m.id) ? "on" : ""}`} onClick={() => toggle(m.id)}>
              {m.name}
            </span>
          ))}
        </div>
      </div>
      <div className="err">{err}</div>
      <div className="actions">
        <button type="button" className="btn ghost" onClick={onClose}>Cancel</button>
        <button type="submit" className="btn" disabled={saving}>{saving ? "Saving…" : "Save"}</button>
      </div>
      {exp && (
        <div className="actions">
          <button type="button" className="btn danger" onClick={remove}>
            {armed ? "Tap again to delete" : "Delete expense"}
          </button>
        </div>
      )}
    </Sheet>
  );
}
