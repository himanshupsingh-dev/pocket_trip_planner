import { inr, settle } from "../lib/money.js";

function Bars({ data, icons = {} }) {
  const rows = Object.entries(data).sort((a, b) => b[1] - a[1]);
  if (!rows.length) return <div className="empty">No spending yet</div>;
  const max = Math.max(1, ...rows.map((r) => r[1]));
  return (
    <div className="bars">
      {rows.map(([k, v]) => (
        <div className="row" key={k}>
          <div>{icons[k] ? icons[k] + " " : ""}{k}</div>
          <div className="track"><div className="fill" style={{ width: (v / max) * 100 + "%" }} /></div>
          <div className="v">{inr(v)}</div>
        </div>
      ))}
    </div>
  );
}

export default function Settle({ trip, members, stats, nameOf, canEdit, onEditTrip }) {
  const xs = settle(members, stats.bal);
  return (
    <section>
      <div className="card">
        <h3 style={{ fontSize: 19 }}>Who pays whom</h3>
        <p className="note" style={{ margin: "4px 0 0" }}>Fewest payments needed to settle everything.</p>
        {stats.unpaidTotal > 0 && (
          <p className="note warn">⚠️ {inr(stats.unpaidTotal)} of expenses have no payer yet, so they're not counted. Open them and save to claim them.</p>
        )}
        {xs.length ? xs.map(([f, t, a]) => (
          <div className="xfer" key={f + t}>
            <span>{nameOf(f)}</span><span className="arrow">pays →</span><span>{nameOf(t)}</span>
            <span className="a">{inr(a)}</span>
          </div>
        )) : <div className="allok" style={{ marginTop: 10 }}>✅ Everyone is settled</div>}
      </div>

      <div className="card">
        <h3 style={{ fontSize: 19 }}>Everyone's balance</h3>
        {members.map((m) => {
          const b = Math.round(stats.bal[m.id] || 0);
          return (
            <div className="person" key={m.id}>
              <div className="n">{m.name}</div>
              <div className={`bal ${b > 0 ? "pos" : b < 0 ? "neg" : ""}`}>
                {b > 0 ? "gets back " + inr(b) : b < 0 ? "owes " + inr(-b) : "settled ✔"}
              </div>
              <div className="d">Paid {inr(stats.paid[m.id])} · Share {inr(stats.share[m.id])}</div>
            </div>
          );
        })}
        <p className="note" style={{ marginTop: 10 }}>
          Total spent {inr(stats.total)} · {inr(stats.total / members.length)} per person on average
        </p>
      </div>

      <div className="card"><h3 style={{ fontSize: 19 }}>Spent by category</h3><Bars data={stats.byCat} icons={trip.categories} /></div>
      <div className="card"><h3 style={{ fontSize: 19 }}>Spent by place</h3><Bars data={stats.byPlace} /></div>
      <button className="btn ghost wide" disabled={!canEdit} onClick={onEditTrip}>⚙️ Edit trip &amp; members</button>
    </section>
  );
}
