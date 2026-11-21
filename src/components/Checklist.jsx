import { useState } from "react";
import { saveChecklistItem, deleteChecklistItem, saveChecklist } from "../lib/db.js";
import { fmtDay, todayISO, addDays } from "../lib/dates.js";

export default function Checklist({ trip, items = [], canEdit = true }) {
  const today = todayISO();
  const tomorrow = addDays(today, 1);

  const [filter, setFilter] = useState("all"); // "all" | "pending" | "done"
  const [newText, setNewText] = useState("");
  const [newDate, setNewDate] = useState(today);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  // Edit state
  const [editingId, setEditingId] = useState(null);
  const [editText, setEditText] = useState("");
  const [editDate, setEditDate] = useState("");

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

  const handleAdd = async (e) => {
    e.preventDefault();
    const text = newText.trim();
    if (!text || !canEdit || saving) return;
    setSaving(true);
    setErr("");
    const newItem = {
      text,
      date: newDate || "",
      done: false,
      createdAt: Date.now(),
    };
    try {
      try {
        await saveChecklistItem(trip.id, null, newItem);
      } catch {
        // Fallback to trip document if subcollection rule isn't deployed yet
        const id = "chk-" + Date.now() + "-" + Math.random().toString(36).slice(2, 6);
        await saveChecklist(trip.id, [...items, { id, ...newItem }]);
      }
      setNewText("");
    } catch (e) {
      setErr(e?.message || "Failed to add task");
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (item) => {
    if (!canEdit) return;
    setErr("");
    const id = item._id || item.id;
    const body = {
      text: item.text,
      date: item.date || "",
      done: !item.done,
      createdAt: item.createdAt || Date.now(),
    };
    try {
      try {
        await saveChecklistItem(trip.id, id, body);
      } catch {
        const updated = items.map((it) =>
          (it._id || it.id) === id ? { ...it, done: !it.done } : it
        );
        await saveChecklist(trip.id, updated);
      }
    } catch (e) {
      setErr(e?.message || "Failed to update task");
    }
  };

  const startEdit = (item) => {
    const id = item._id || item.id;
    setEditingId(id);
    setEditText(item.text);
    setEditDate(item.date || "");
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditText("");
    setEditDate("");
  };

  const handleSaveEdit = async (item) => {
    const text = editText.trim();
    if (!text || !canEdit) return;
    setErr("");
    const id = item._id || item.id;
    const body = {
      text,
      date: editDate || "",
      done: item.done || false,
      createdAt: item.createdAt || Date.now(),
    };
    try {
      try {
        await saveChecklistItem(trip.id, id, body);
      } catch {
        const updated = items.map((it) =>
          (it._id || it.id) === id ? { ...it, text, date: editDate || "" } : it
        );
        await saveChecklist(trip.id, updated);
      }
      cancelEdit();
    } catch (e) {
      setErr(e?.message || "Failed to save edit");
    }
  };

  const handleDelete = async (id) => {
    if (!canEdit) return;
    if (window.confirm("Delete this checklist item?")) {
      setErr("");
      try {
        try {
          await deleteChecklistItem(trip.id, id);
        } catch {
          const updated = items.filter((it) => (it._id || it.id) !== id);
          await saveChecklist(trip.id, updated);
        }
        if (editingId === id) cancelEdit();
      } catch (e) {
        setErr(e?.message || "Failed to delete task");
      }
    }
  };

  return (
    <section className="checklist-page">
      <div className="card">
        <h3>Pending checklist 📋</h3>
        <p className="note sub">
          Shared checklist for everyone on this trip. Anyone can view, add, and edit tasks.
        </p>

        {/* Add item form */}
        <form className="chk-add" onSubmit={handleAdd}>
          <div className="chk-fields">
            <div className="f">
              <label htmlFor="chk-date">Due date</label>
              <input
                id="chk-date"
                type="date"
                value={newDate}
                onChange={(e) => setNewDate(e.target.value)}
                disabled={!canEdit}
              />
            </div>
            <div className="f">
              <label htmlFor="chk-text">What needs to be done?</label>
              <input
                id="chk-text"
                type="text"
                placeholder="e.g. Book cab, pack jackets"
                maxLength={200}
                value={newText}
                onChange={(e) => setNewText(e.target.value)}
                disabled={!canEdit}
                required
              />
            </div>
          </div>
          <button
            type="submit"
            className="btn"
            disabled={!newText.trim() || !canEdit || saving}
          >
            {saving ? "Adding…" : "+ Add task"}
          </button>
          <div className="err">{err}</div>
        </form>

        {/* Filter chips */}
        <div className="chips">
          <button
            type="button"
            className={`chip ${filter === "all" ? "on" : ""}`}
            onClick={() => setFilter("all")}
          >
            All ({items.length})
          </button>
          <button
            type="button"
            className={`chip ${filter === "pending" ? "on" : ""}`}
            onClick={() => setFilter("pending")}
          >
            Pending ({pendingCount})
          </button>
          <button
            type="button"
            className={`chip ${filter === "done" ? "on" : ""}`}
            onClick={() => setFilter("done")}
          >
            Completed ({doneCount})
          </button>
        </div>
      </div>

      {/* Checklist items */}
      <div className="card list">
        {!displayed.length ? (
          <div className="empty">
            {items.length === 0
              ? "No tasks yet. Add your first task above!"
              : filter === "pending"
              ? "🎉 No pending tasks! Everything is done."
              : "No completed tasks yet."}
          </div>
        ) : (
          <ul className="chk-list" aria-label="Checklist items">
            {displayed.map((item) => {
              const id = item._id || item.id;
              const isEditing = editingId === id;
              const isPast = !!item.date && item.date < today;
              const isToday = !!item.date && item.date === today;
              const isTomorrow = !!item.date && item.date === tomorrow;

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
                    <div className="actions">
                      <button
                        type="button"
                        className="btn danger"
                        onClick={() => handleDelete(id)}
                      >
                        Delete
                      </button>
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
    </section>
  );
}
