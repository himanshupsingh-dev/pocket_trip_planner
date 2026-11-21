import { useEffect, useState } from "react";
import Sheet from "./Sheet.jsx";
import { saveExpense, deleteExpense } from "../lib/db.js";
import { todayISO } from "../lib/dates.js";
import { round2 } from "../lib/money.js";

export default function ExpenseSheet({ trip, exp, me, members, nameOf, onClose }) {
  const CATS = trip.categories, PLACES = trip.places;
  const allIds = members.map((m) => m.id);
  const [desc, setDesc] = useState(exp?.desc || "");
  const [amount, setAmount] = useState(exp?.amount || "");
  const [date, setDate] = useState(exp?.date || todayISO());
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
  const isNew = !exp;
  const canModify = isNew || !exp.paidBy || exp.paidBy === me;
  const payer = exp?.paidBy || me;
  const everyone = split.size === allIds.length;

  const toggle = (id) => {
    if (!canModify) return;
    const s = new Set(split);
    s.has(id) ? s.delete(id) : s.add(id);
    setSplit(s);
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!canModify) return setErr(`Only ${nameOf(exp.paidBy)} can edit this expense.`);
    const d = desc.trim(), a = round2(amount);
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
    if (!canModify) return setErr(`Only ${nameOf(exp?.paidBy)} can delete this expense.`);
    if (!armed) return setArmed(true);
    try { await deleteExpense(trip.id, exp._id); onClose(); }
    catch { setErr("Couldn't delete — please try again."); }
  };

  let title = "Expense details";
  if (canModify) title = exp ? "Edit expense" : "Add expense";

  return (
    <Sheet as="form" title={title} onClose={onClose} onSubmit={canModify ? submit : (e) => { e.preventDefault(); onClose(); }}>
      {!canModify && (
        <p className="note lead">
          🔒 Paid by <b>{nameOf(exp.paidBy)}</b>. Only {nameOf(exp.paidBy)} can edit or delete this expense.
        </p>
      )}
      <div className="f">
        <label htmlFor="e-desc">What was it for?</label>
        <input id="e-desc" value={desc} onChange={(e) => setDesc(e.target.value)} disabled={!canModify} placeholder="e.g. Dinner, fuel, tickets" maxLength={120} />
      </div>
      <div className="two">
        <div className="f">
          <label htmlFor="e-amount">Amount (₹)</label>
          <input id="e-amount" type="number" inputMode="decimal" min="0" step="0.01" placeholder="0.00" disabled={!canModify}
            value={amount} onChange={(e) => setAmount(e.target.value)} />
        </div>
        <div className="f">
          <label htmlFor="e-date">Date</label>
          <input id="e-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} disabled={!canModify} />
        </div>
      </div>
      <div className="two">
        <div className="f">
          <label htmlFor="e-cat">Category</label>
          <select id="e-cat" value={category} onChange={(e) => setCategory(e.target.value)} disabled={!canModify}>
            {Object.keys(CATS).map((k) => <option key={k}>{k}</option>)}
          </select>
        </div>
        <div className="f">
          <label htmlFor="e-place">Place</label>
          <select id="e-place" value={place} onChange={(e) => setPlace(e.target.value)} disabled={!canModify}>
            {PLACES.map((p) => <option key={p}>{p}</option>)}
          </select>
        </div>
      </div>
      <div className="f">
        <span className="flabel">Paid by</span>
        <div className="paidtxt">{payer === me ? `You (${nameOf(me)})` : nameOf(payer)}</div>
      </div>
      <fieldset className="f">
        <legend>Split between</legend>
        <div className="chips">
          <button type="button" className={`chip ${everyone ? "on" : ""}`} aria-pressed={everyone} disabled={!canModify}
            onClick={() => setSplit(new Set(everyone ? [] : allIds))}>Everyone</button>
          {members.map((m) => (
            <button type="button" key={m.id} className={`chip ${split.has(m.id) ? "on" : ""}`} aria-pressed={split.has(m.id)}
              disabled={!canModify} onClick={() => toggle(m.id)}>
              {m.name}
            </button>
          ))}
        </div>
      </fieldset>
      <div className="err">{err}</div>
      <div className="actions">
        {canModify ? (
          <>
            <button type="button" className="btn ghost" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn" disabled={saving}>{saving ? "Saving…" : "Save"}</button>
          </>
        ) : (
          <button type="button" className="btn wide" onClick={onClose}>Close</button>
        )}
      </div>
      {exp && canModify && (
        <div className="actions">
          <button type="button" className="btn danger" onClick={remove}>
            {armed ? "Tap again to delete" : "Delete expense"}
          </button>
        </div>
      )}
    </Sheet>
  );
}
