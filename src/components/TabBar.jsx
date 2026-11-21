const TABS = [
  ["plan", "🗺️", "Plan"],
  ["expenses", "🧾", "Expenses"],
  ["budget", "📊", "Budget"],
  ["settle", "⚖️", "Settle up"],
];

export default function TabBar({ tripId, view }) {
  return (
    <nav className="tabs">
      {TABS.map(([id, icon, label]) => (
        <a key={id} href={`#/${tripId}/${id}`} className={view === id ? "on" : ""}>
          <span className="i">{icon}</span>{label}
        </a>
      ))}
    </nav>
  );
}
