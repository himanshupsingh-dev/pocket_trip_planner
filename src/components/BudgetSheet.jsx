import { useState } from "react";
import Sheet from "./Sheet.jsx";
import { updateTrip } from "../lib/db.js";
import { inr } from "../lib/money.js";

/** Set the total budget and an estimate for each category. */
export default function BudgetSheet({ trip, onClose }) {
  const cats = Object.entries(trip.categories);
  const [budget, setBudget] = useState(trip.budget || "");
  const [est, setEst] = useState(() => Object.fromEntries(cats.map(([k]) => [k, trip.estimates[k] || ""])));
  const [err, setErr] = useState("");
  const [saving, setSaving] = useState(false);

  const b = Number(budget) || 0;
  const total = cats.reduce((a, [k]) => a + (Number(est[k]) || 0), 0);

  let vsBudget = "";
  if (b && total > b) vsBudget = ` — ${inr(total - b)} more than the budget`;
  else if (b) vsBudget = ` — ${inr(b - total)} under the budget`;

  const submit = async (e) => {
    e.preventDefault();
    if (b < 0 || cats.some(([k]) => Number(est[k]) < 0)) return setErr("Amounts can't be negative.");
    setSaving(true);
    try {
      await updateTrip(trip.id, {
        budget: b,
        estimates: Object.fromEntries(cats.map(([k]) => [k, Math.max(0, Number(est[k]) || 0)])),
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
        <input id="b-total" type="number" inputMode="numeric" min="0" step="1" placeholder="e.g. 120000"
          value={budget} onChange={(e) => setBudget(e.target.value)} />
      </div>
      <fieldset className="f">
        <legend>Estimated cost per category (₹)</legend>
        {cats.map(([k, icon]) => (
          <div className="estrow" key={k}>
            <span>{icon} {k}</span>
            <input type="number" inputMode="numeric" min="0" step="1" placeholder="0" aria-label={`${k} estimate`}
              value={est[k]} onChange={(e) => setEst({ ...est, [k]: e.target.value })} />
          </div>
        ))}
      </fieldset>
      <p className="note">Estimates add up to <b>{inr(total)}</b>{vsBudget}.</p>
      <div className="err">{err}</div>
      <div className="actions">
        <button type="button" className="btn ghost" onClick={onClose}>Cancel</button>
        <button type="submit" className="btn" disabled={saving}>{saving ? "Saving…" : "Save"}</button>
      </div>
    </Sheet>
  );
}
