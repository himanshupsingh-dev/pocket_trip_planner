import { inr, settle } from "../lib/money.js";

function Bars({ data, icons = {} }) {
  const rows = Object.entries(data).sort((a, b) => b[1] - a[1]);
  if (!rows.length) return <div className="empty">No spending yet</div>;
  const max = Math.max(1, ...rows.map((r) => r[1]));
  return (
    <div className="bars">
      {rows.map(([k, v]) => (
        <div className="row" key={k}>
          <div className="k">{icons[k] ? icons[k] + " " : ""}{k}</div>
          <div className="track" aria-hidden="true"><div className="fill" style={{ width: (v / max) * 100 + "%" }} /></div>
          <div className="v">{inr(v)}</div>
        </div>
      ))}
    </div>
  );
}

function SelectMe({ text, onSelectMe }) {
  return (
    <div className="gap">
      <p className="note">{text}</p>
      {onSelectMe && <button type="button" className="btn ghost small" onClick={onSelectMe}>👤 Select your name</button>}
    </div>
  );
}

const initial = (name) => (name || "?").trim().charAt(0).toUpperCase();

export default function Settle({ trip, members, stats, expenses = [], nameOf, me, onSelectMe, canEdit, onEditTrip }) {
  const meValid = !!me && members.some((m) => m.id === me);
  const xs = settle(members, expenses);
  const myXs = meValid ? xs.filter(([f, t]) => f === me || t === me) : [];
  const myBal = meValid ? Math.round(stats.bal[me] || 0) : 0;

  let balCls = "", balLabel = "You're settled up ✔", balAmt = inr(0);
  if (myBal > 0) { balCls = "pos"; balLabel = "You get back"; balAmt = inr(myBal); }
  else if (myBal < 0) { balCls = "neg"; balLabel = "You owe"; balAmt = inr(-myBal); }

  let xfers;
  if (!meValid) {
    xfers = <SelectMe text="Select who you are to see which payments you need to make or receive." onSelectMe={onSelectMe} />;
  } else if (myXs.length) {
    xfers = myXs.map(([f, t, a]) => {
      const youPay = f === me;
      const other = youPay ? t : f;
      return (
        <div className={`xfer ${youPay ? "pay" : "rec"}`} key={f + t}>
          <span className="av" aria-hidden="true">{initial(nameOf(other))}</span>
          <span className="xt">
            {youPay ? <>You pay <b>{nameOf(t)}</b></> : <><b>{nameOf(f)}</b> pays you</>}
            <small>{youPay ? "you owe" : "owes you"}</small>
          </span>
          <span className="a">{inr(a)}</span>
        </div>
      );
    });
  } else {
    xfers = <div className="allok">{xs.length === 0 ? "✅ Everyone is settled" : "✅ You are all settled up"}</div>;
  }

  return (
    <section>
      <div className="card">
        <h3>Your settlements</h3>
        <p className="note sub">Direct settlements with group members.</p>
        {stats.unpaidTotal > 0 && (
          <p className="note warn">⚠️ {inr(stats.unpaidTotal)} of expenses have no payer yet, so they're not counted. Open them and save to claim them.</p>
        )}
        {xfers}
      </div>

      <div className="card">
        <h3>Your balance</h3>
        {meValid ? (
          <div className="balance">
            <div className={`balnum ${balCls}`}>
              <span>{balLabel}</span>
              <b>{balAmt}</b>
            </div>
            <div className="balrows">
              <div><span>You paid</span><b>{inr(stats.paid[me])}</b></div>
              <div><span>Your share</span><b>{inr(stats.share[me])}</b></div>
            </div>
          </div>
        ) : (
          <SelectMe text="Select who you are to see your individual balance." onSelectMe={onSelectMe} />
        )}
        <p className="note foot">
          Total spent {inr(stats.total)} · {inr(stats.total / (members.length || 1))} per person on average
        </p>
      </div>

      <div className="card"><h3>Spent by category</h3><Bars data={stats.byCat} icons={trip.categories} /></div>
      <div className="card"><h3>Spent by place</h3><Bars data={stats.byPlace} /></div>
      <button type="button" className="btn ghost wide" disabled={!canEdit} onClick={onEditTrip}>⚙️ Edit trip &amp; members</button>
    </section>
  );
}
