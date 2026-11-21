import { useEffect, useState } from "react";
import { templateList } from "../trips/index.js";
import { knownTrips, rememberTrip } from "../lib/device.js";
import { isConfigured } from "../lib/db.js";
import { fmtRange } from "../lib/dates.js";
import TripSheet from "../components/TripSheet.jsx";

export default function Home() {
  const [creating, setCreating] = useState(false);

  useEffect(() => { document.title = "Pocket Trip Planner"; }, []);

  // Trips opened or created on this device, plus built-in ones not opened yet.
  const mine = knownTrips();
  const trips = [...mine, ...templateList().filter((t) => !mine.some((m) => m.id === t.id))];

  const onCreated = (trip) => {
    rememberTrip(trip);
    location.hash = `#/${trip.id}/plan`;
  };

  return (
    <>
      <header className="hero">
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
      </div>

      {creating && <TripSheet onClose={() => setCreating(false)} onSaved={onCreated} />}
    </>
  );
}
