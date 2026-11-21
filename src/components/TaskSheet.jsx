import { useState } from "react";
import Sheet from "./Sheet.jsx";
import { saveChecklistItem, saveChecklist } from "../lib/db.js";
import { todayISO } from "../lib/dates.js";

/** "+ Add task" on the Checklist tab: one task for the trip's shared checklist. */
export default function TaskSheet({ trip, onClose }) {
  const [date, setDate] = useState(todayISO());
  const [text, setText] = useState("");
  const [err, setErr] = useState("");
  const [saving, setSaving] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    const t = text.trim();
    if (!t) return setErr("Describe the task, e.g. “Book cab to airport”.");
    setSaving(true);
    setErr("");
    const task = { text: t, date: date || "", done: false, createdAt: Date.now() };
    try {
      try {
        await saveChecklistItem(trip.id, null, task);
      } catch {
        // checklist rules not published yet: keep the task on the trip document (see Checklist.jsx)
        const id = "chk-" + Date.now() + "-" + Math.random().toString(36).slice(2, 6);
        await saveChecklist(trip.id, [...(trip.checklist || []), { id, ...task }]);
      }
      onClose();
    } catch {
      setErr("Couldn't add the task — please try again.");
      setSaving(false);
    }
  };

  return (
    <Sheet as="form" title="Add task" onClose={onClose} onSubmit={submit}>
      <div className="chk-fields">
        <div className="f">
          <label htmlFor="task-date">Due date</label>
          <input id="task-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
        <div className="f">
          <label htmlFor="task-text">What needs to be done?</label>
          <input id="task-text" autoFocus value={text} maxLength={200} placeholder="e.g. Book cab, pack jackets"
            onChange={(e) => setText(e.target.value)} />
        </div>
      </div>
      <div className="err">{err}</div>
      <div className="actions">
        <button type="button" className="btn ghost" onClick={onClose}>Cancel</button>
        <button type="submit" className="btn" disabled={saving}>{saving ? "Adding…" : "Add task"}</button>
      </div>
    </Sheet>
  );
}
