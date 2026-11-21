import { useState } from "react";
import { inr } from "../lib/money.js";
import { fmtDay, dayCount } from "../lib/dates.js";

function statusMsg(status, hasAny) {
  if (status === "setup")
    return <div className="empty">⚙️ Setup needed: paste your Firebase config into <b>src/firebase-config.js</b> (see README).</div>;
  if (status === "loading" && !hasAny) return <div className="empty">Loading expenses…</div>;
  if (status === "slow" && !hasAny) return <div className="empty">Can't reach the shared expenses yet — check your connection.</div>;
  if (status.startsWith("error:"))
    return <div className="empty">Shared expenses aren't available ({status.slice(6)}). Check the Firestore rules in the README.</div>;
  return null;
}

function Chip({ on, onClick, children }) {
  return (
    <button type="button" className={`chip ${on ? "on" : ""}`} aria-pressed={on} onClick={onClick}>{children}</button>
  );
}

/** Expenses in date order (undated last), grouped into one block per date. */
function groupByDate(list) {
  const groups = [];
  for (const e of list) {
    const date = e.date || "";
    let g = groups.at(-1);
    if (!g || g.date !== date) {
      g = { date, items: [], total: 0 };
      groups.push(g);
    }
    g.items.push(e);
    g.total += Number(e.amount) || 0;
  }
  return groups;
}

export default function Expenses({ trip, members, expenses, status, nameOf, me, canEdit, onAdd, onOpen }) {
  const CATS = trip.categories;
  const [who, setWho] = useState("");
  const [cat, setCat] = useState("");

  // Only offer filters that match something (plus whatever is selected right now).
  const payers = members.filter((m) => m.id === who || expenses.some((e) => e.paidBy === m.id));
  const used = new Set(expenses.map((e) => e.category || "Other"));
  const cats = Object.keys(CATS).filter((k) => k === cat || used.has(k));

  let list = [...expenses].sort(
    (a, b) => (a.date || "9999").localeCompare(b.date || "9999") || (a.createdAt || 0) - (b.createdAt || 0)
  );
  if (who) list = list.filter((e) => e.paidBy === who);
  if (cat) list = list.filter((e) => (e.category || "Other") === cat);
  const shownTotal = list.reduce((a, e) => a + (Number(e.amount) || 0), 0);
  const filtered = !!(who || cat);

  const dayLabel = (date) => {
    if (!date || !trip.startDate || date < trip.startDate || (trip.endDate && date > trip.endDate)) return "";
    return "Day " + dayCount(trip.startDate, date);
  };

  const msg = statusMsg(status, expenses.length > 0);
  const label = (id) => (id === me ? "you" : nameOf(id));
  let empty = "";
  if (!msg && list.length === 0) {
    empty = expenses.length ? "Nothing matches this filter." : "No expenses yet — tap “＋ Add expense” to add the first one.";
  }

  return (
    <section>
      {!msg && expenses.length > 0 && (
        <div className="filters">
          {payers.length > 1 && (
            <div className="chiprow" role="group" aria-label="Filter by who paid">
              <span className="chiplabel" aria-hidden="true">Paid by</span>
              <Chip on={!who} onClick={() => setWho("")}>Everyone</Chip>
              {payers.map((m) => (
                <Chip key={m.id} on={who === m.id} onClick={() => setWho(who === m.id ? "" : m.id)}>
                  {m.id === me ? "You" : m.name}
                </Chip>
              ))}
            </div>
          )}
          {cats.length > 1 && (
            <div className="chiprow" role="group" aria-label="Filter by category">
              <span className="chiplabel" aria-hidden="true">Category</span>
              <Chip on={!cat} onClick={() => setCat("")}>All</Chip>
              {cats.map((k) => (
                <Chip key={k} on={cat === k} onClick={() => setCat(cat === k ? "" : k)}>
                  <span aria-hidden="true">{CATS[k]}</span> {k}
                </Chip>
              ))}
            </div>
          )}
        </div>
      )}

      {msg && <div className="card">{msg}</div>}
      {empty && <div className="card empty">{empty}</div>}
      {!msg && !empty && (
        <>
          <div className="listsum">
            <span role="status">{list.length} {list.length === 1 ? "expense" : "expenses"} · <b>{inr(shownTotal)}</b></span>
            {filtered && (
              <button type="button" className="linkbtn" onClick={() => { setWho(""); setCat(""); }}>Clear filters</button>
            )}
          </div>
          {groupByDate(list).map((g) => (
            <div key={g.date || "none"} className="expgroup">
              <h3 className="grouphead">
                <span>{g.date ? fmtDay(g.date) : "No date"}{dayLabel(g.date) && <span className="dn">{dayLabel(g.date)}</span>}</span>
                <span className="tot">{inr(g.total)}</span>
              </h3>
              <div className="card list">
                {g.items.map((e) => {
                  const a = Number(e.amount) || 0;
                  const n = (Array.isArray(e.split) ? e.split.length : members.length) || members.length;
                  return (
                    <button type="button" key={e._id} className={`exp ${!a || !e.paidBy ? "pending" : ""}`} onClick={() => onOpen(e)}>
                      <span className="ic" aria-hidden="true">{CATS[e.category] || "📌"}</span>
                      <span className="mid">
                        <span className="t">{e.desc || "Expense"}</span>
                        <span className="s">
                          {e.place ? e.place + " · " : ""}
                          {e.paidBy ? <>paid by <b>{label(e.paidBy)}</b></> : <span className="warn">not filled yet</span>}
                        </span>
                      </span>
                      <span className="amt">
                        {a ? inr(a) : "₹ —"}
                        {a > 0 && <small>{inr(a / n)} each · {n} ppl</small>}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </>
      )}
      <p className="note">Tap any expense to view or edit it. Only the person who paid for an expense can edit or delete it.</p>

      <button type="button" className="fab" onClick={onAdd} disabled={status === "setup" || !canEdit}>
        <span className="plus" aria-hidden="true">＋</span>Add expense
      </button>
    </section>
  );
}
