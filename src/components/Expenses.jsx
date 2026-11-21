import { useState } from "react";
import { inr } from "../lib/money.js";

function statusMsg(status, hasAny) {
  if (status === "setup")
    return <div className="empty">⚙️ Setup needed: paste your Firebase config into <b>src/firebase-config.js</b> (see README).</div>;
  if (status === "loading" && !hasAny) return <div className="empty">Loading expenses…</div>;
  if (status === "slow" && !hasAny) return <div className="empty">Can't reach the shared expenses yet — check your connection.</div>;
  if (status.startsWith("error:"))
    return <div className="empty">Shared expenses aren't available ({status.slice(6)}). Check the Firestore rules in the README.</div>;
  return null;
}

export default function Expenses({ trip, members, expenses, status, nameOf, onAdd, onOpen }) {
  const CATS = trip.categories;
  const [who, setWho] = useState("");
  const [cat, setCat] = useState("");

  let list = [...expenses].sort(
    (a, b) => (a.date || "").localeCompare(b.date || "") || (a.createdAt || 0) - (b.createdAt || 0)
  );
  if (who) list = list.filter((e) => e.paidBy === who);
  if (cat) list = list.filter((e) => (e.category || "Other") === cat);

  const msg = statusMsg(status, expenses.length > 0);

  return (
    <section>
      <div className="toolbar">
        <button className="btn" onClick={onAdd} disabled={status === "setup"}>＋ Add expense</button>
        <select className="filter" value={who} onChange={(e) => setWho(e.target.value)}>
          <option value="">Paid by: everyone</option>
          {members.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
        </select>
        <select className="filter" value={cat} onChange={(e) => setCat(e.target.value)}>
          <option value="">All categories</option>
          {Object.keys(CATS).map((k) => <option key={k}>{k}</option>)}
        </select>
      </div>

      <div className="card">
        {msg ? msg : list.length === 0 ? (
          <div className="empty">{expenses.length ? "Nothing matches this filter." : "No expenses yet — tap “＋ Add expense”."}</div>
        ) : list.map((e) => {
          const a = Number(e.amount) || 0;
          const n = (Array.isArray(e.split) ? e.split.length : members.length) || members.length;
          const dt = e.date ? new Date(e.date + "T00:00").toLocaleDateString("en-IN", { day: "numeric", month: "short" }) : "";
          return (
            <div key={e._id} className={`exp ${!a || !e.paidBy ? "pending" : ""}`} onClick={() => onOpen(e)}>
              <div className="ic">{CATS[e.category] || "📌"}</div>
              <div className="mid">
                <div className="t">{e.desc || "Expense"}</div>
                <div className="s">
                  {dt}{e.place ? " · " + e.place : ""} ·{" "}
                  {e.paidBy ? <>paid by <b>{nameOf(e.paidBy)}</b></> : <span className="warn">not filled yet</span>}
                </div>
              </div>
              <div className="amt">
                {a ? inr(a) : "₹ —"}
                {a > 0 && <small>{inr(a / n)} each · {n} ppl</small>}
              </div>
            </div>
          );
        })}
      </div>
      <p className="note">Tap any expense to view or edit it. Only the person who paid for an expense can edit or delete it.</p>
    </section>
  );
}
