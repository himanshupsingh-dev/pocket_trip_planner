import { useId, useState } from "react";
import { fmtDay, todayISO } from "../lib/dates.js";

const sortDays = (days) =>
  [...days].sort(
    (a, b) => (a.date || "9999").localeCompare(b.date || "9999") || (a.createdAt || 0) - (b.createdAt || 0)
  );

function Day({ d, n, today, canEdit, onEdit }) {
  const isToday = !!d.date && d.date === today;
  const isPast = !!d.date && d.date < today;
  const [open, setOpen] = useState(isToday);
  const id = useId();
  const groups = Array.isArray(d.groups) ? d.groups : [];
  const count = groups.reduce((a, g) => a + (g.items?.length || 0), 0);
  const hasPills = d.nostay || d.stay || d.badge;
  let summary = "No places added";
  if (count) summary = `${count} ${count === 1 ? "place" : "places"}`;

  return (
    <li className={`tl ${d.stay ? "" : "nostay"} ${isToday ? "today" : ""} ${isPast ? "past" : ""}`}>
      <span className="node" aria-hidden="true">{isPast ? "✓" : n}</span>
      <div className={`card day ${open ? "open" : ""}`}>
        <h3 className="dayh">
          <button type="button" className="daybtn" aria-expanded={open} aria-controls={id} onClick={() => setOpen(!open)}>
            <span className="dayhead">
              <span className="dleft">
                <span className="dlabel">Day {n}{isToday && <span className="todaypill">Today</span>}</span>
                <span className="dtitle">{d.title}</span>
              </span>
              <span className="date">{fmtDay(d.date)}</span>
            </span>
            {d.route && <span className="route">🚗 <small>{d.route}</small></span>}
            {hasPills && (
              <span className="pills">
                {d.nostay && <span className="pill no">🚫 {d.nostay}</span>}
                {d.stay && <span className="pill stay">🏨 {d.stay}</span>}
                {d.badge && <span className="pill badge">{d.badge}</span>}
              </span>
            )}
            <span className="more">
              {summary} · {open ? "Hide" : "Show"}
              <svg className="chev" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6" /></svg>
            </span>
          </button>
        </h3>
        <div className="sights" id={id} hidden={!open}>
          {groups.map((g, i) => (
            <div key={i}>
              <h4>{g.h}</h4>
              <ul>{(g.items || []).map((x, j) => <li key={j}>{x}</li>)}</ul>
            </div>
          ))}
          {d.note && <p className="note warn">💡 {d.note}</p>}
          {canEdit && (
            <button type="button" className="btn ghost small" onClick={() => onEdit(d)}>
              ✏️ Edit day
            </button>
          )}
        </div>
      </div>
    </li>
  );
}

export default function Plan({ trip, days, canEdit, onEditDay }) {
  const list = sortDays(days);
  const today = todayISO();
  return (
    <section>
      {list.length === 0 && (
        <div className="card empty">No days planned yet.{canEdit && " Tap “＋ Add day” to start."}</div>
      )}
      {list.length > 0 && (
        <ol className="timeline">
          {list.map((d, i) => <Day key={d._id} d={d} n={i + 1} today={today} canEdit={canEdit} onEdit={onEditDay} />)}
        </ol>
      )}
      {canEdit && <button type="button" className="btn ghost wide" onClick={() => onEditDay(null)}>＋ Add day</button>}
      {trip.planNote && <div className="card note">{trip.planNote}</div>}
    </section>
  );
}
