// 24×24 line icons, drawn in the current text colour.
const ICONS = {
  plan: <><path d="M9 4 3.5 6.2v13.3L9 17.3l6 2.2 5.5-2.2V4L15 6.2 9 4Z" /><path d="M9 4v13.3M15 6.2v13.3" /></>,
  checklist: <><path d="m9 11 3 3L22 4" /><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" /></>,
  expenses: <><path d="M6 3h12v18l-3-1.8-3 1.8-3-1.8L6 21V3Z" /><path d="M9.5 8h5M9.5 11.5h5M9.5 15h3" /></>,
  budget: <><path d="M4 20h16" /><rect x="5.5" y="11" width="3" height="6" rx="1" /><rect x="10.5" y="7" width="3" height="10" rx="1" /><rect x="15.5" y="4" width="3" height="13" rx="1" /></>,
  settle: <><path d="M5 8h13l-3.5-3.5" /><path d="M19 16H6l3.5 3.5" /></>,
};

const TABS = [
  ["plan", "Plan"],
  ["checklist", "Checklist"],
  ["expenses", "Expenses"],
  ["budget", "Budget"],
  ["settle", "Settle up"],
];

export default function TabBar({ tripId, view }) {
  return (
    <nav className="tabs" aria-label="Trip sections">
      <div className="in">
        {TABS.map(([id, label]) => (
          <a key={id} href={`#/${tripId}/${id}`} className={view === id ? "on" : ""} aria-current={view === id ? "page" : undefined}>
            <span className="i">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                {ICONS[id]}
              </svg>
            </span>
            {label}
          </a>
        ))}
      </div>
    </nav>
  );
}
