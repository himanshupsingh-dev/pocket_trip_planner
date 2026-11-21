import { useEffect, useMemo, useState } from "react";
import { getTemplate, normalizeTrip, templateDoc, templateDays } from "../trips/index.js";
import { compute, inr, budgetSummary } from "../lib/money.js";
import { isConfigured, watchTrip, watchList, seedTrip } from "../lib/db.js";
import { getMe, setMe as storeMe, rememberTrip, getUserName, setUserName, isDevMode } from "../lib/device.js";
import { fmtRange } from "../lib/dates.js";
import Plan from "../components/Plan.jsx";
import Expenses from "../components/Expenses.jsx";
import Budget from "../components/Budget.jsx";
import Settle from "../components/Settle.jsx";
import TabBar from "../components/TabBar.jsx";
import ExpenseSheet from "../components/ExpenseSheet.jsx";
import WhoSheet from "../components/WhoSheet.jsx";
import TripSheet from "../components/TripSheet.jsx";
import ShareSheet from "../components/ShareSheet.jsx";
import DaySheet from "../components/DaySheet.jsx";
import BudgetSheet from "../components/BudgetSheet.jsx";

const pct = (a, b) => (b > 0 ? Math.round((a / b) * 100) + "% of budget" : "");

function BudgetTiles({ trip, sum }) {
  const over = sum.budget > 0 && sum.remaining < 0;
  let remainingNote = "";
  if (over) remainingNote = "⚠ over budget";
  else if (sum.budget) remainingNote = "left to spend";
  const estNote = sum.budget > 0 && sum.estimated === sum.budget ? "sum of categories" : pct(sum.estimated, sum.budget);
  return (
    <a className="stats" href={`#/${trip.id}/budget`} aria-label="Open budget">
      <div className="stat"><span>Budget</span><b>{sum.budget ? inr(sum.budget) : "Not set"}</b>
        <small>{sum.budget ? "total for the trip" : "tap to set"}</small></div>
      <div className="stat"><span>Estimated</span><b>{inr(sum.estimated)}</b><small>{estNote}</small></div>
      <div className="stat"><span>Actual</span><b>{inr(sum.actual)}</b><small>{pct(sum.actual, sum.budget) || "spent so far"}</small></div>
      <div className={`stat ${over ? "neg" : ""}`}><span>Remaining</span>
        <b>{sum.budget ? inr(sum.remaining) : "—"}</b>
        <small>{remainingNote}</small></div>
    </a>
  );
}

function Message({ children }) {
  return (
    <>
      <header className="hero"><nav className="crumb"><a href="#/">← All trips</a></nav><h1>Pocket Trip Planner 🧳</h1></header>
      <div className="wrap"><div className="card empty" style={{ marginTop: -48 }}>{children}</div></div>
    </>
  );
}

export default function TripPage({ tripId, view }) {
  const template = getTemplate(tripId);
  const [dbTrip, setDbTrip] = useState(null);       // trip fields from the database
  const [dbDays, setDbDays] = useState(null);       // null until the database answers
  const [expenses, setExpenses] = useState([]);
  const [tripState, setTripState] = useState(isConfigured ? "loading" : "setup");
  const [status, setStatus] = useState(isConfigured ? "loading" : "setup");
  const [me, setMe] = useState(() => getMe(tripId));
  const [devMode, setDevMode] = useState(() => isDevMode());
  const [sheet, setSheet] = useState(null);

  useEffect(() => {
    const onDev = (e) => setDevMode(e.detail);
    window.addEventListener("ptp-dev-mode-change", onDev);
    return () => window.removeEventListener("ptp-dev-mode-change", onDev);
  }, []);

  // Until the database answers (or with no database), built-in trips show their template.
  const trip = useMemo(() => {
    if (dbTrip) return normalizeTrip(tripId, dbTrip);
    return template ? normalizeTrip(tripId, templateDoc(template)) : null;
  }, [dbTrip, tripId, template]);
  const days = dbDays ?? (template ? templateDays(template) : []);
  const members = trip?.members || [];

  // live data
  useEffect(() => {
    if (!isConfigured) return;
    const timer = setTimeout(() => setStatus((s) => (s === "loading" ? "slow" : s)), 10000);
    const fail = (err) => { clearTimeout(timer); setStatus("error:" + (err?.code || "error")); };
    let seeding = false;
    const un1 = watchTrip(tripId, (data) => {
      if (data) { setDbTrip(data); setTripState("ok"); }
      else if (template && !seeding) { seeding = true; seedTrip(template).catch(fail); }
      else if (!template) setTripState("missing");
    }, (err) => setTripState("error:" + (err?.code || "error")));
    const un2 = watchList(tripId, "expenses",
      (list, fromCache) => { setExpenses(list); if (!fromCache) { setStatus("ok"); clearTimeout(timer); } }, fail);
    const un3 = watchList(tripId, "days", (list, fromCache) => { if (!fromCache || list.length) setDbDays(list); }, () => {});
    return () => { clearTimeout(timer); un1(); un2(); un3(); };
  }, [tripId, template]);

  // remember this trip on the device; keep the tab title current
  useEffect(() => {
    if (!trip) return;
    rememberTrip(trip);
    document.title = `${trip.title} · Pocket Trip Planner`;
  }, [trip]);

  const meValid = !!me && members.some((m) => m.id === me);

  // When members load, auto-match if device has a default user name and no active member set
  useEffect(() => {
    if (me || !members.length) return;
    const storedName = getUserName().trim().toLowerCase();
    if (!storedName) return;
    const match = members.find((m) => m.name.trim().toLowerCase() === storedName);
    if (match) {
      setMe(match.id);
      storeMe(tripId, match.id);
    }
  }, [tripId, members, me]);

  // first visit: ask who you are using member buttons if not matched yet
  useEffect(() => {
    if (dbTrip && !meValid) {
      setSheet((s) => s || { type: "who" });
    }
  }, [!!dbTrip, meValid]);

  const stats = useMemo(() => compute(members, expenses), [members, expenses]);
  const sum = useMemo(() => (trip ? budgetSummary(trip, stats) : null), [trip, stats]);

  if (!trip) {
    if (tripState === "setup") return <Message>⚙️ Setup needed: paste your Firebase config into <b>src/firebase-config.js</b>.</Message>;
    if (tripState === "missing") return <Message>This trip doesn't exist. Check that the link is complete.</Message>;
    if (tripState.startsWith("error:")) return <Message>Couldn't open this trip ({tripState.slice(6)}).</Message>;
    return <Message>Loading trip…</Message>;
  }

  const nameOf = (id) => members.find((m) => m.id === id)?.name || "—";
  const canEdit = isConfigured && !!dbTrip;

  const chooseMe = (id) => {
    setMe(id);
    storeMe(tripId, id);
    const m = members.find((x) => x.id === id);
    if (m?.name) {
      setUserName(m.name);
    }
    const next = sheet?.next;
    setSheet(next ? { type: "exp", exp: next.exp } : null);
  };

  const openExpense = (exp) => {
    if (!canEdit) return;
    if (!meValid) setSheet({ type: "who", next: { exp } });
    else setSheet({ type: "exp", exp });
  };

  const close = () => setSheet(null);

  return (
    <>
      <header className="hero">
        <nav className="crumb"><a href="#/">← All trips</a></nav>
        {trip.subtitle && <div className="kick">{trip.subtitle}</div>}
        <h1>{trip.title} {trip.emoji}</h1>
        {trip.startDate && <p>{fmtRange(trip.startDate, trip.endDate)}</p>}
        <div className="heroacts">
          {devMode ? (
            <button className="hbtn" onClick={() => setSheet({ type: "who" })}>
              👤 {meValid ? `${nameOf(me)} · change (Dev)` : "Select user (Dev)"}
            </button>
          ) : meValid ? (
            <span className="hbtn" style={{ cursor: "default" }}>
              👤 {nameOf(me)}
            </span>
          ) : (
            <button className="hbtn" onClick={() => setSheet({ type: "who" })}>
              👤 Select your name
            </button>
          )}
          {canEdit && <button className="hbtn" onClick={() => setSheet({ type: "share" })}>🔗 Invite</button>}
          {canEdit && <button className="hbtn" onClick={() => setSheet({ type: "trip" })}>⚙️ Edit trip</button>}
        </div>
      </header>

      <div className="wrap">
        <BudgetTiles trip={trip} sum={sum} />

        {view === "plan" && (
          <Plan trip={trip} days={days} canEdit={canEdit}
            onEditDay={(day) => setSheet({ type: "day", day })} />
        )}
        {view === "expenses" && (
          <Expenses
            trip={trip} members={members} expenses={expenses} status={status} nameOf={nameOf}
            onAdd={() => openExpense(null)} onOpen={openExpense}
          />
        )}
        {view === "budget" && (
          <Budget sum={sum} canEdit={canEdit} onEdit={() => setSheet({ type: "budget" })} />
        )}
        {view === "settle" && (
          <Settle
            trip={trip} members={members} stats={stats} expenses={expenses} nameOf={nameOf} me={me}
            onSelectMe={() => setSheet({ type: "who" })}
            canEdit={canEdit} onEditTrip={() => setSheet({ type: "trip" })}
          />
        )}
      </div>

      <TabBar tripId={trip.id} view={view} />

      {sheet?.type === "exp" && (
        <ExpenseSheet trip={trip} exp={sheet.exp} me={me} members={members} nameOf={nameOf} onClose={close} />
      )}
      {sheet?.type === "who" && (
        <WhoSheet
          members={members}
          me={me}
          onPick={chooseMe}
          onClose={meValid ? close : null}
          isDev={devMode}
        />
      )}
      {sheet?.type === "trip" && <TripSheet trip={trip} expenses={expenses} onClose={close} />}
      {sheet?.type === "share" && <ShareSheet trip={trip} onClose={close} />}
      {sheet?.type === "day" && <DaySheet trip={trip} days={days} day={sheet.day} onClose={close} />}
      {sheet?.type === "budget" && <BudgetSheet trip={trip} expenses={expenses} onClose={close} />}
    </>
  );
}
