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

export default function Settle({ trip, members, stats, expenses = [], nameOf, me, onSelectMe, canEdit, onEditTrip }) {
  const meValid = !!me && members.some((m) => m.id === me);
  const xs = settle(members, expenses);
  const myXs = meValid ? xs.filter(([f, t]) => f === me || t === me) : [];
  const myBal = meValid ? Math.round(stats.bal[me] || 0) : 0;

  return (
    <section>
      <div className="card">
        <h3 style={{ fontSize: 19 }}>Your settlements</h3>
        <p className="note" style={{ margin: "4px 0 0" }}>Direct settlements with group members.</p>
        {stats.unpaidTotal > 0 && (
          <p className="note warn">⚠️ {inr(stats.unpaidTotal)} of expenses have no payer yet, so they're not counted. Open them and save to claim them.</p>
        )}
        {!meValid ? (
          <div style={{ marginTop: 10 }}>
            <p className="note">Select who you are to see which payments you need to make or receive.</p>
            {onSelectMe && (
              <button className="btn ghost small" style={{ marginTop: 8 }} onClick={onSelectMe}>
                👤 Select your name
              </button>
            )}
          </div>
        ) : myXs.length ? (
          myXs.map(([f, t, a]) => {
            const isPayer = f === me;
            return (
              <div className={`xfer ${isPayer ? "" : "rec"}`} key={f + t}>
                <span>{isPayer ? "You pay" : nameOf(f) + " pays"}</span>
                <span className="arrow">→</span>
                <span>{isPayer ? nameOf(t) : "You"}</span>
                <span className="a">{inr(a)}</span>
              </div>
            );
          })
        ) : (
          <div className="allok" style={{ marginTop: 10 }}>
            {xs.length === 0 ? "✅ Everyone is settled" : "✅ You are all settled up"}
          </div>
        )}
      </div>

      <div className="card">
        <h3 style={{ fontSize: 19 }}>Your balance</h3>
        {!meValid ? (
          <div style={{ marginTop: 6 }}>
            <p className="note">Select who you are to see your individual balance.</p>
            {onSelectMe && (
              <button className="btn ghost small" style={{ marginTop: 8 }} onClick={onSelectMe}>
                👤 Select your name
              </button>
            )}
          </div>
        ) : (
          <div className="person">
            <div className="n">{nameOf(me)} (You)</div>
            <div className={`bal ${myBal > 0 ? "pos" : myBal < 0 ? "neg" : ""}`}>
              {myBal > 0 ? "gets back " + inr(myBal) : myBal < 0 ? "owes " + inr(-myBal) : "settled ✔"}
            </div>
            <div className="d">Paid {inr(stats.paid[me])} · Your share {inr(stats.share[me])}</div>
          </div>
        )}
        <p className="note" style={{ marginTop: 10 }}>
          Total spent {inr(stats.total)} · {inr(stats.total / (members.length || 1))} per person on average
        </p>
      </div>

      <div className="card"><h3 style={{ fontSize: 19 }}>Spent by category</h3><Bars data={stats.byCat} icons={trip.categories} /></div>
      <div className="card"><h3 style={{ fontSize: 19 }}>Spent by place</h3><Bars data={stats.byPlace} /></div>
      <button className="btn ghost wide" disabled={!canEdit} onClick={onEditTrip}>⚙️ Edit trip &amp; members</button>
    </section>
  );
}
