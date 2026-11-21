import { useState } from "react";
import Sheet from "./Sheet.jsx";

/** The trip link is the key to the trip — this sheet hands it out. */
export default function ShareSheet({ trip, onClose }) {
  const url = `${location.origin}${location.pathname}#/${trip.id}/plan`;
  const [msg, setMsg] = useState("");
  const canShare = typeof navigator.share === "function";

  const copy = async () => {
    try { await navigator.clipboard.writeText(url); setMsg("✅ Link copied"); }
    catch { setMsg("Select the link above and copy it."); }
  };
  const share = async () => {
    try { await navigator.share({ title: trip.title, text: `Join our trip: ${trip.title}`, url }); }
    catch { /* cancelled */ }
  };

  return (
    <Sheet onClose={onClose}>
      <h2>Invite members 🔗</h2>
      <p className="note" style={{ marginTop: -6 }}>
        Send this link to the people on this trip. They pick their name once, then can see the plan and add expenses.
      </p>
      <input className="linkbox" readOnly value={url} aria-label="Trip link" onFocus={(e) => e.target.select()} />
      <div className="actions">
        <button type="button" className="btn" onClick={copy}>Copy link</button>
        {canShare && <button type="button" className="btn ghost" onClick={share}>Share…</button>}
      </div>
      <p className="note" role="status">{msg}</p>
      <p className="note warn">
        🔒 Anyone with this link can open and edit the trip — share it only with the group.
        New people need a name in <b>⚙️ Edit trip → Members</b> before they can pick it.
      </p>
    </Sheet>
  );
}
