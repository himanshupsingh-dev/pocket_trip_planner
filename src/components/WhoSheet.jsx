import Sheet from "./Sheet.jsx";

export default function WhoSheet({ members, me, onPick, onClose }) {
  return (
    <Sheet onClose={onClose}>
      <h2>Who are you? 👋</h2>
      <p className="note" style={{ marginTop: -6 }}>
        Pick your name once. Anything you add will be saved as paid by you.
      </p>
      <div className="pick">
        {members.map((m) => (
          <button key={m.id} type="button" className={m.id === me ? "on" : ""} onClick={() => onPick(m.id)}>
            {m.name}
          </button>
        ))}
      </div>
    </Sheet>
  );
}
