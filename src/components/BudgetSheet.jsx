import { useState } from "react";
import Sheet from "./Sheet.jsx";
import { updateTrip } from "../lib/db.js";
import { inr } from "../lib/money.js";

/** Set the total budget and an estimate for each category, and manage categories. */
export default function BudgetSheet({ trip, expenses = [], onClose }) {
  const [categories, setCategories] = useState(() =>
    Object.entries(trip.categories).map(([name, icon]) => ({ name, icon }))
  );
  const [est, setEst] = useState(() => ({ ...trip.estimates }));
  const [adding, setAdding] = useState(false);
  const [newIcon, setNewIcon] = useState("");
  const [newName, setNewName] = useState("");
  const [err, setErr] = useState("");
  const [saving, setSaving] = useState(false);

  const total = categories.reduce((a, c) => a + (Number(est[c.name]) || 0), 0);

  const removeCat = (name) => {
    if (categories.length <= 1) {
      return setErr("You need at least one category.");
    }
    const inUse = expenses.some((e) => (Number(e.amount) || 0) > 0 && e.category === name);
    if (inUse) {
      return setErr(`"${name}" is used by some expenses, so it can't be removed. Change those expenses first.`);
    }
    setCategories(categories.filter((c) => c.name !== name));
    const nextEst = { ...est };
    delete nextEst[name];
    setEst(nextEst);
    setErr("");
  };

  const addCat = () => {
    const n = newName.trim();
    if (!n) return setErr("Enter a category name.");
    if (categories.some((c) => c.name.toLowerCase() === n.toLowerCase())) {
      return setErr(`A category named "${n}" already exists.`);
    }
    const icon = newIcon.trim() || "📌";
    setCategories([...categories, { name: n, icon }]);
    setEst({ ...est, [n]: "" });
    setNewName("");
    setNewIcon("");
    setAdding(false);
    setErr("");
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!categories.length) return setErr("Add at least one category.");
    if (categories.some((c) => Number(est[c.name]) < 0)) return setErr("Amounts can't be negative.");
    setSaving(true);
    try {
      await updateTrip(trip.id, {
        budget: total,
        categories: categories.map((c) => ({ name: c.name.trim(), icon: c.icon.trim() || "📌" })),
        estimates: Object.fromEntries(categories.map((c) => [c.name, Math.max(0, Number(est[c.name]) || 0)])),
      });
      onClose();
    } catch {
      setErr("Couldn't save — please try again.");
      setSaving(false);
    }
  };

  return (
    <Sheet as="form" onClose={onClose} onSubmit={submit}>
      <h2>Budget &amp; estimates</h2>
      <div className="f">
        <label htmlFor="b-total">Total trip budget (₹)</label>
        <input
          id="b-total"
          type="text"
          readOnly
          value={total ? inr(total) : "₹0"}
          aria-label="Total trip budget"
          style={{ background: "var(--bg)", fontWeight: 700, color: "var(--ink)", cursor: "default" }}
        />
        <small className="note" style={{ margin: "4px 0 0" }}>
          Calculated automatically as the sum of all category estimates below.
        </small>
      </div>
      <fieldset className="f">
        <legend>Estimated cost per category (₹)</legend>
        {categories.map((c) => (
          <div className="estrow" key={c.name}>
            <span className="n">{c.icon} {c.name}</span>
            <input type="number" inputMode="numeric" min="0" step="1" placeholder="0" aria-label={`${c.name} estimate`}
              value={est[c.name] ?? ""} onChange={(e) => setEst({ ...est, [c.name]: e.target.value })} />
            <button type="button" className="x small" title={`Remove ${c.name}`} aria-label={`Remove ${c.name}`}
              onClick={() => removeCat(c.name)}>×</button>
          </div>
        ))}
        {adding ? (
          <div className="addcat">
            <input className="caticon" value={newIcon} maxLength={4} placeholder="🏷️"
              aria-label="Category icon" onChange={(e) => setNewIcon(e.target.value)} />
            <input className="catname" value={newName} maxLength={30} placeholder="Category name"
              autoFocus aria-label="Category name" onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addCat(); } }} />
            <button type="button" className="btn small" onClick={addCat}>Add</button>
            <button type="button" className="btn ghost small" onClick={() => { setAdding(false); setErr(""); }}>Cancel</button>
          </div>
        ) : (
          <button type="button" className="btn ghost small" style={{ marginTop: 6 }} onClick={() => { setAdding(true); setErr(""); }}>
            ＋ Add category
          </button>
        )}
      </fieldset>
      <p className="note">Estimates add up to <b>{inr(total)}</b> across {categories.length} {categories.length === 1 ? "category" : "categories"}.</p>
      <div className="err">{err}</div>
      <div className="actions">
        <button type="button" className="btn ghost" onClick={onClose}>Cancel</button>
        <button type="submit" className="btn" disabled={saving}>{saving ? "Saving…" : "Save"}</button>
      </div>
    </Sheet>
  );
}
