import { useEffect, useState } from "react";
import { saveChecklistItem, deleteChecklistItem, saveChecklist } from "../lib/db.js";
import { fmtDay, todayISO, addDays, dayCount } from "../lib/dates.js";

export default function Checklist({ trip, items = [], canEdit = true, onAdd }) {
  const today = todayISO();
  const tomorrow = addDays(today, 1);

  const [filter, setFilter] = useState("all"); // "all" | "pending" | "done"
  const [err, setErr] = useState("");

  // Edit state
  const [editingId, setEditingId] = useState(null);
  const [editText, setEditText] = useState("");
  const [editDate, setEditDate] = useState("");
  // Delete asks for a second tap (like expenses) instead of a browser pop-up; it disarms after 3 s.
  const [armed, setArmed] = useState(false);

  useEffect(() => {
    if (!armed) return;
    const t = setTimeout(() => setArmed(false), 3000);
    return () => clearTimeout(t);
  }, [armed]);

  // A task normally lives in trips/{id}/checklist/{taskId} (it then has `_id`). Tasks saved while the
  // checklist rules weren't published sit in the trip document's `checklist` array instead (`id`),
  // and a task can be in both. Writes must touch only the trip's own array, never the merged list.
  const idOf = (it) => it._id || it.id;
  const docList = trip.checklist || [];
  const inDoc = (id) => docList.some((it) => idOf(it) === id);
  const withoutDoc = (id) => docList.filter((it) => idOf(it) !== id);

  const pendingCount = items.filter((i) => !i.done).length;
  const doneCount = items.filter((i) => i.done).length;

  // Ordered strictly in ascending order of the date
  const sorted = [...items].sort((a, b) => {
    const da = a.date || "9999-99-99";
    const db = b.date || "9999-99-99";
    const cmp = da.localeCompare(db);
    if (cmp !== 0) return cmp;
    return (a.createdAt || 0) - (b.createdAt || 0);
  });

  const displayed = sorted.filter((item) => {
    if (filter === "pending") return !item.done;
    if (filter === "done") return item.done;
    return true;
  });

  let emptyText = "No completed tasks yet.";
  if (!items.length) emptyText = "No tasks yet — tap “＋ Add task” to add the first one.";
  else if (filter === "pending") emptyText = "🎉 No pending tasks! Everything is done.";

  /**
   * Save a task to its own document. If that's refused (rules not published) and the task is on the
   * trip document, update it there instead. If it worked and an old copy is on the trip document,
   * drop that copy, so the task now lives in one place and Delete removes it for good.
   */
  const saveItem = async (item, body) => {
    const id = idOf(item);
    try {
      await saveChecklistItem(trip.id, id, body);
    } catch (e) {
      if (!inDoc(id)) throw e;
      await saveChecklist(trip.id, docList.map((it) => (idOf(it) === id ? { ...it, ...body } : it)));
      return;
    }
    if (inDoc(id)) await saveChecklist(trip.id, withoutDoc(id));
  };

  const handleToggle = async (item) => {
    if (!canEdit) return;
    setErr("");
    try {
      await saveItem(item, {
        text: item.text,
        date: item.date || "",
        done: !item.done,
        createdAt: item.createdAt || Date.now(),
      });
    } catch (e) {
      setErr(e?.message || "Failed to update task");
    }
  };

  const startEdit = (item) => {
    setEditingId(idOf(item));
    setEditText(item.text);
    setEditDate(item.date || "");
    setArmed(false);
    setErr("");
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditText("");
    setEditDate("");
    setArmed(false);
  };

  const handleSaveEdit = async (item) => {
    const text = editText.trim();
    if (!text || !canEdit) return;
    setErr("");
    try {
      await saveItem(item, {
        text,
        date: editDate || "",
        done: item.done || false,
        createdAt: item.createdAt || Date.now(),
      });
      cancelEdit();
    } catch (e) {
      setErr(e?.message || "Failed to save edit");
    }
  };

  const handleDelete = async (item) => {
    if (!canEdit) return;
    if (!armed) return setArmed(true);
    const id = idOf(item);
    setErr("");
    try {
      // remove every copy: its own document and/or the entry in the trip document's array
      await Promise.all([
        item._id ? deleteChecklistItem(trip.id, id) : null,
        inDoc(id) ? saveChecklist(trip.id, withoutDoc(id)) : null,
      ]);
      cancelEdit();
    } catch (e) {
      setArmed(false);
      setErr(e?.message || "Failed to delete task");
    }
  };

  return (
    <section>
      {/* filter chips, laid out like the Expenses filters (no card) */}
      <div className="filters">
        <div className="chiprow" role="group" aria-label="Filter tasks">
          {[["all", "All", items.length], ["pending", "Pending", pendingCount], ["done", "Completed", doneCount]].map(
            ([key, label, count]) => (
              <button
                key={key}
                type="button"
                className={`chip ${filter === key ? "on" : ""}`}
                aria-pressed={filter === key}
                onClick={() => setFilter(key)}
              >
                {label} ({count})
              </button>
            )
          )}
        </div>
      </div>
      {/* while a task is open for editing, its errors show next to it instead */}
      <div className="err">{!editingId && err}</div>

      {/* Checklist items */}
      <div className="card list">
        {!displayed.length ? (
          <div className="empty">
            {emptyText}
          </div>
        ) : (
          <ul className="chk-list" aria-label="Checklist items">
            {displayed.map((item) => {
              const id = item._id || item.id;
              const isEditing = editingId === id;
              const isPast = !!item.date && item.date < today;
              const isToday = !!item.date && item.date === today;
              const isTomorrow = !!item.date && item.date === tomorrow;
              // further out than tomorrow: whole days from today (always 2+)
              const daysLeft = item.date && item.date > tomorrow ? dayCount(today, item.date) - 1 : 0;

              if (isEditing) {
                return (
                  <li key={id} className="chk-item editing">
                    <div className="chk-fields">
                      <div className="f">
                        <label htmlFor={`chk-date-${id}`}>Due date</label>
                        <input
                          id={`chk-date-${id}`}
                          type="date"
                          value={editDate}
                          onChange={(e) => setEditDate(e.target.value)}
                        />
                      </div>
                      <div className="f">
                        <label htmlFor={`chk-text-${id}`}>What needs to be done?</label>
                        <input
                          id={`chk-text-${id}`}
                          type="text"
                          maxLength={200}
                          value={editText}
                          onChange={(e) => setEditText(e.target.value)}
                          required
                        />
                      </div>
                    </div>
                    <div className="err">{err}</div>
                    <div className="actions">
                      <button
                        type="button"
                        className="btn ghost"
                        onClick={cancelEdit}
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        className="btn"
                        onClick={() => handleSaveEdit(item)}
                        disabled={!editText.trim()}
                      >
                        Save
                      </button>
                    </div>
                    <div className="actions">
                      <button
                        type="button"
                        className="btn danger"
                        onClick={() => handleDelete(item)}
                      >
                        {armed ? "Tap again to delete" : "Delete task"}
                      </button>
                    </div>
                  </li>
                );
              }

              return (
                <li key={id} className={`chk-item ${item.done ? "done" : ""}`}>
                  <button
                    type="button"
                    className={`chk-tick ${item.done ? "checked" : ""}`}
                    onClick={() => handleToggle(item)}
                    aria-label={item.done ? "Mark as pending" : "Mark as done"}
                  >
                    {item.done ? "✓" : ""}
                  </button>
                  <div className="chk-content" onClick={() => handleToggle(item)}>
                    <div className="chk-text">{item.text}</div>
                    <div className="chk-meta">
                      <span>{item.date ? <>📅 {fmtDay(item.date)}</> : "No date"}</span>
                      {!item.done && isPast && <span className="pill bad">⚠️ Overdue</span>}
                      {!item.done && isToday && <span className="pill today">Today</span>}
                      {!item.done && isTomorrow && <span className="pill soon">Tomorrow</span>}
                      {!item.done && daysLeft > 0 && <span className="pill left">{daysLeft} days remaining</span>}
                    </div>
                  </div>
                  <div className="chk-actions">
                    <button
                      type="button"
                      className="btn ghost small"
                      onClick={() => startEdit(item)}
                      title="Edit task"
                    >
                      ✏️ Edit
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* floating button, same as "Add expense"; opens TaskSheet */}
      <button type="button" className="fab" onClick={onAdd} disabled={!canEdit}>
        <span className="plus" aria-hidden="true">＋</span>Add task
      </button>
    </section>
  );
}
