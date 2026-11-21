import { useState } from "react";
import { fmtDay } from "../lib/dates.js";

const sortDays = (days) =>
  [...days].sort(
    (a, b) => (a.date || "9999").localeCompare(b.date || "9999") || (a.createdAt || 0) - (b.createdAt || 0)
  );

function Day({ d, n, canEdit, onEdit }) {
  const [open, setOpen] = useState(false);
  const groups = Array.isArray(d.groups) ? d.groups : [];
  const count = groups.reduce((a, g) => a + (g.items?.length || 0), 0);
  return (
    <div className={`card day ${d.stay ? "" : "nostay"} ${open ? "open" : ""}`} onClick={() => setOpen(!open)}>
      <div className="dayhead">
        <div><div className="dlabel">Day {n}</div><h3>{d.title}</h3></div>
        <div className="date">{fmtDay(d.date)}</div>
      </div>
      {d.route && <div className="route">🚗 <small>{d.route}</small></div>}
      {d.nostay && <span className="pill no">🚫 {d.nostay}</span>}
      {d.stay && <span className="pill stay">🏨 {d.stay}</span>}
      {d.badge && <span className="pill badge">{d.badge}</span>}
      <div className="sights">
        {groups.map((g, i) => (
          <div key={i}>
            <h4>{g.h}</h4>
            <ul>{(g.items || []).map((x, j) => <li key={j}>{x}</li>)}</ul>
          </div>
        ))}
        {d.note && <p className="note warn">💡 {d.note}</p>}
        {canEdit && (
          <button type="button" className="btn ghost small" onClick={(e) => { e.stopPropagation(); onEdit(d); }}>
            ✏️ Edit day
          </button>
        )}
      </div>
      <div className="more">{count} {count === 1 ? "place" : "places"} · tap to {open ? "hide" : "show"}</div>
    </div>
  );
}

export default function Plan({ trip, days, canEdit, onEditDay }) {
  const list = sortDays(days);
  return (
    <section>
      {list.length === 0 && (
        <div className="card empty">No days planned yet.{canEdit && " Tap “＋ Add day” to start."}</div>
      )}
      {list.map((d, i) => <Day key={d._id} d={d} n={i + 1} canEdit={canEdit} onEdit={onEditDay} />)}
      {canEdit && <button className="btn ghost wide" onClick={() => onEditDay(null)}>＋ Add day</button>}
      {trip.planNote && <div className="card note">{trip.planNote}</div>}
    </section>
  );
}
