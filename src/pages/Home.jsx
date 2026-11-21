import { useEffect, useState } from "react";
import { templateList } from "../trips/index.js";
import { knownTrips, rememberTrip, isDevMode, setDevMode, checkDevPassword, getUserName } from "../lib/device.js";
import { isConfigured } from "../lib/db.js";
import { fmtRange } from "../lib/dates.js";
import TripSheet from "../components/TripSheet.jsx";
import Sheet from "../components/Sheet.jsx";

export default function Home() {
  const [creating, setCreating] = useState(false);
  const [devActive, setDevActive] = useState(() => isDevMode());
  const [showDevModal, setShowDevModal] = useState(false);
  const [devPass, setDevPass] = useState("");
  const [devErr, setDevErr] = useState("");

  useEffect(() => { document.title = "Pocket Trip Planner"; }, []);

  useEffect(() => {
    const onDev = (e) => setDevActive(e.detail);
    window.addEventListener("ptp-dev-mode-change", onDev);
    return () => window.removeEventListener("ptp-dev-mode-change", onDev);
  }, []);

  // Trips opened or created on this device, plus built-in ones not opened yet.
  const mine = knownTrips();
  const trips = [...mine, ...templateList().filter((t) => !mine.some((m) => m.id === t.id))];

  const onCreated = (trip) => {
    rememberTrip(trip);
    location.hash = `#/${trip.id}/plan`;
  };

  const handleDevSubmit = (e) => {
    e.preventDefault();
    if (checkDevPassword(devPass)) {
      setDevMode(true);
      setDevActive(true);
      setShowDevModal(false);
      setDevPass("");
      setDevErr("");
    } else {
      setDevErr("Incorrect password. Please try again.");
    }
  };

  const handleDisableDev = () => {
    setDevMode(false);
    setDevActive(false);
  };

  const currentDeviceUser = getUserName();

  return (
    <>
      <header className="hero">
        {devActive ? (
          <div className="devbadge">🛠️ Developer mode active</div>
        ) : (
          currentDeviceUser && <div className="devbadge" style={{ background: "rgba(255,255,255,.15)" }}>👤 {currentDeviceUser}</div>
        )}
        <div className="kick">Plans · budgets · shared expenses</div>
        <h1>Pocket Trip Planner 🧳</h1>
        <p>Your trips</p>
      </header>

      <div className="wrap trips">
        {trips.map((t) => (
          <a key={t.id} className="card trip" href={`#/${t.id}/plan`}>
            <div className="ic">{t.emoji || "🧳"}</div>
            <div className="mid">
              <h3>{t.title}</h3>
              {t.startDate && <div className="s">{fmtRange(t.startDate, t.endDate)}</div>}
              {t.subtitle && <div className="s">{t.subtitle}</div>}
            </div>
            <span className="go" aria-hidden="true">›</span>
          </a>
        ))}

        <button className="btn newtrip" onClick={() => setCreating(true)} disabled={!isConfigured}>
          ＋ New trip
        </button>
        <p className="note center">
          {isConfigured
            ? "Trips you create or open on this device show up here. Invite members from inside a trip."
            : "⚙️ Connect Firebase (src/firebase-config.js) to create trips."}
        </p>

        <div className="devsection">
          {devActive ? (
            <div className="devcard">
              <div className="devstatus">
                <span className="dot" />
                <span>Developer mode: <b>Active</b> {currentDeviceUser ? `(${currentDeviceUser})` : ""}</span>
              </div>
              <button type="button" className="btn ghost small" onClick={handleDisableDev}>
                Deactivate
              </button>
            </div>
          ) : (
            <button
              type="button"
              className="devtrigger"
              onClick={() => { setShowDevModal(true); setDevPass(""); setDevErr(""); }}
            >
              🛠️ Developer mode
            </button>
          )}
        </div>
      </div>

      {creating && <TripSheet onClose={() => setCreating(false)} onSaved={onCreated} />}

      {showDevModal && (
        <Sheet as="form" onClose={() => setShowDevModal(false)} onSubmit={handleDevSubmit}>
          <h2>🛠️ Developer Mode</h2>
          <p className="note" style={{ margin: "-4px 0 14px" }}>
            Enter the developer password to activate global developer mode.
          </p>
          <div className="f">
            <label htmlFor="dev-pw">Password</label>
            <input
              id="dev-pw"
              type="password"
              autoFocus
              placeholder="Enter password"
              value={devPass}
              onChange={(e) => { setDevPass(e.target.value); setDevErr(""); }}
            />
          </div>
          {devErr && <div className="err">{devErr}</div>}
          <div className="actions">
            <button type="button" className="btn ghost" onClick={() => setShowDevModal(false)}>
              Cancel
            </button>
            <button type="submit" className="btn">
              Unlock
            </button>
          </div>
        </Sheet>
      )}
    </>
  );
}
