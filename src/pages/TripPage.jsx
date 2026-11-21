import { useEffect, useMemo, useRef, useState } from "react";
import { getTemplate, normalizeTrip, templateDoc, templateDays } from "../trips/index.js";
import { compute, inr, budgetSummary, sharedCategories } from "../lib/money.js";
import { isConfigured, watchTrip, watchList, seedTrip } from "../lib/db.js";
import { getMe, setMe as storeMe, rememberTrip, getUserName, setUserName, isDevMode } from "../lib/device.js";
import { fmtRange, tripStatus } from "../lib/dates.js";
import Plan from "../components/Plan.jsx";
import Checklist from "../components/Checklist.jsx";
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

/**
 * Budget / Actual / Remaining for the active user's categories (group amounts; whole trip when
 * nobody is selected or the trip only has a trip-wide budget), plus the user's own share.
 */
function BudgetTiles({ trip, sum, share }) {
  const over = sum.budget > 0 && sum.remaining < 0;
  let remainingNote = "";
  if (over) remainingNote = "⚠ over budget";
  else if (sum.budget) remainingNote = "left to spend";
  let budgetNote = "tap to set";
  if (sum.budget) budgetNote = sum.scope === "mine" ? "your categories" : "whole trip";
  const used = sum.budget > 0 ? Math.min(100, (sum.actual / sum.budget) * 100) : 0;
  return (
    <a className="stats" href={`#/${trip.id}/budget`} aria-label="Open budget">
      <div className="stat"><span>Budget</span><b>{sum.budget ? inr(sum.budget) : "Not set"}</b>
        <small>{budgetNote}</small></div>
      <div className="stat"><span>Actual</span><b>{inr(sum.actual)}</b><small>{pct(sum.actual, sum.budget) || "spent so far"}</small>
        {sum.budget > 0 && <i className={`mini ${over ? "over" : ""}`} aria-hidden="true"><i style={{ width: used + "%" }} /></i>}
      </div>
      <div className={`stat ${over ? "neg" : ""}`}><span>Remaining</span>
        <b>{sum.budget ? inr(sum.remaining) : "—"}</b>
        <small>{remainingNote}</small></div>
      <div className="stat"><span>Your share</span>
        <b>{share == null ? "—" : inr(share)}</b>
        <small>{share == null ? "select your name" : "what it's cost you"}</small></div>
    </a>
  );
}

function Message({ children }) {
  return (
    <>
      <header className="hero compact">
        <div className="herobar"><a className="back" href="#/">← All trips</a></div>
        <h1>Pocket Trip Planner 🧳</h1>
      </header>
      <div className="wrap"><div className="card empty overlap">{children}</div></div>
    </>
  );
}

export default function TripPage({ tripId, view }) {
  const template = getTemplate(tripId);
  const [dbTrip, setDbTrip] = useState(null);       // trip fields from the database
  const [dbDays, setDbDays] = useState(null);       // null until the database answers
  const [expenses, setExpenses] = useState([]);
  const [checklist, setChecklist] = useState([]);
  const [tripState, setTripState] = useState(isConfigured ? "loading" : "setup");
  const [status, setStatus] = useState(isConfigured ? "loading" : "setup");
  const [me, setMe] = useState(() => getMe(tripId));
  const [devMode, setDevMode] = useState(() => isDevMode());
  const [sheet, setSheet] = useState(null);
  const titleRef = useRef(null);
  const [scrolled, setScrolled] = useState(false);  // trip title scrolled out of view → show the slim top bar

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
    const un4 = watchList(tripId, "checklist", (list) => setChecklist(list), () => {});
    return () => { clearTimeout(timer); un1(); un2(); un3(); un4(); };
  }, [tripId, template]);

  // remember this trip on the device; keep the tab title current
  useEffect(() => {
    if (!trip) return;
    rememberTrip(trip);
    document.title = `${trip.title} · Pocket Trip Planner`;
  }, [trip]);

  const hasTrip = !!trip;
  useEffect(() => {
    const el = titleRef.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(([e]) => setScrolled(!e.isIntersecting && e.boundingClientRect.top < 0));
    io.observe(el);
    return () => io.disconnect();
  }, [hasTrip]);

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
    if (!dbTrip || meValid) return;
    // the auto-match above runs in this same render; don't ask if it is about to pick a member
    const storedName = getUserName().trim().toLowerCase();
    if (!me && storedName && members.some((m) => m.name.trim().toLowerCase() === storedName)) return;
    setSheet((s) => s || { type: "who" });
  }, [!!dbTrip, meValid]); // eslint-disable-line react-hooks/exhaustive-deps

  const stats = useMemo(() => compute(members, expenses), [members, expenses]);
  const sum = useMemo(() => (trip ? budgetSummary(trip, stats) : null), [trip, stats]);
  // categories the active user is split into (null until they've picked who they are)
  const myCats = useMemo(
    () => (meValid ? sharedCategories(me, members, expenses) : null),
    [meValid, me, members, expenses]
  );
  // the tiles and "Budget used" card: group totals for those categories (whole trip when nobody is selected)
  const mySum = useMemo(() => (trip ? budgetSummary(trip, stats, myCats) : null), [trip, stats, myCats]);

  const allChecklistItems = useMemo(() => {
    const docItems = Array.isArray(trip?.checklist) ? trip.checklist : [];
    if (!checklist.length) return docItems;
    const ids = new Set(checklist.map((i) => i._id || i.id));
    const uniqueDocItems = docItems.filter((i) => !ids.has(i.id || i._id));
    return [...checklist, ...uniqueDocItems];
  }, [trip?.checklist, checklist]);

  if (!trip) {
    if (tripState === "setup") return <Message>⚙️ Setup needed: paste your Firebase config into <b>src/firebase-config.js</b>.</Message>;
    if (tripState === "missing") return <Message>This trip doesn't exist. Check that the link is complete.</Message>;
    if (tripState.startsWith("error:")) return <Message>Couldn't open this trip ({tripState.slice(6)}).</Message>;
    return <Message>Loading trip…</Message>;
  }

  const nameOf = (id) => members.find((m) => m.id === id)?.name || "—";
  const canEdit = isConfigured && !!dbTrip;
  const phase = tripStatus(trip.startDate, trip.endDate);
  const initial = meValid ? nameOf(me).trim().charAt(0).toUpperCase() : "?";
  // Switching identity is only allowed in developer mode; everyone else picks once and is then bound to that name.
  const canSwitch = devMode || !meValid;
  let whoText = "Select your name", whoLabel = "Select your name";
  if (devMode) {
    whoText = meValid ? `${nameOf(me)} (Dev)` : "Select user (Dev)";
    whoLabel = meValid ? `You are ${nameOf(me)} — switch user (developer mode)` : "Select user (developer mode)";
  } else if (meValid) {
    whoText = nameOf(me);
    whoLabel = `You are ${nameOf(me)}`;
  }

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

  const openWho = () => setSheet({ type: "who" });
  const close = () => setSheet(null);

  return (
    <>
      <header className={`hero ${view === "plan" ? "" : "compact"}`}>
        <div className="herobar">
          <a className="back" href="#/">← All trips</a>
          <div className="heroacts">
            {canSwitch ? (
              <button type="button" className="hbtn" onClick={openWho} aria-label={whoLabel}>
                <span aria-hidden="true">{devMode ? "🛠️" : "👤"}</span><span className="who">{whoText}</span>
              </button>
            ) : (
              <span className="hbtn static" title={whoLabel}>
                <span aria-hidden="true">👤</span><span className="who">{whoText}</span>
              </span>
            )}
            {canEdit && (
              <button type="button" className="hbtn icon" onClick={() => setSheet({ type: "share" })}>
                <span aria-hidden="true">🔗</span><span className="lbl">Invite</span>
              </button>
            )}
            {canEdit && (
              <button type="button" className="hbtn icon" onClick={() => setSheet({ type: "trip" })}>
                <span aria-hidden="true">⚙️</span><span className="lbl">Edit trip</span>
              </button>
            )}
          </div>
        </div>
        {trip.subtitle && <div className="kick">{trip.subtitle}</div>}
        <h1 ref={titleRef}>{trip.title} {trip.emoji}</h1>
        {trip.startDate && <p className="dates">{fmtRange(trip.startDate, trip.endDate)}</p>}
        {phase && <span className={`hpill ${phase.cls}`}>{phase.text}</span>}
      </header>

      <div className={`topbar ${scrolled ? "show" : ""}`}>
        <div className="in">
          <a className="tb-back" href="#/" aria-label="All trips">←</a>
          <span className="tt">{trip.emoji} {trip.title}</span>
          {canSwitch ? (
            <button type="button" className="tb-who" onClick={openWho} aria-label={whoLabel}>{initial}</button>
          ) : (
            <span className="tb-who" role="img" aria-label={whoLabel}>{initial}</span>
          )}
        </div>
      </div>

      <div className={`wrap ${view === "expenses" ? "hasfab" : ""}`}>
        <BudgetTiles trip={trip} sum={mySum} share={meValid ? stats.share[me] || 0 : null} />

        {view === "plan" && (
          <Plan trip={trip} days={days} canEdit={canEdit}
            onEditDay={(day) => setSheet({ type: "day", day })} />
        )}
        {view === "checklist" && (
          <Checklist trip={trip} items={allChecklistItems} canEdit={canEdit} />
        )}
        {view === "expenses" && (
          <Expenses
            trip={trip} members={members} expenses={expenses} status={status} nameOf={nameOf} me={me}
            canEdit={canEdit} onAdd={() => openExpense(null)} onOpen={openExpense} onSelectMe={openWho}
          />
        )}
        {view === "budget" && (
          <Budget sum={sum} mySum={mySum} myCats={myCats} onSelectMe={openWho} canEdit={canEdit} onEdit={() => setSheet({ type: "budget" })} />
        )}
        {view === "settle" && (
          <Settle
            trip={trip} members={members} stats={stats} expenses={expenses} nameOf={nameOf} me={me}
            onSelectMe={openWho}
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
