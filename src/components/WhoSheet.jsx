import Sheet from "./Sheet.jsx";

export default function WhoSheet({ members, me, onPick, onClose, isDev = false }) {
  return (
    <Sheet title={isDev ? "Switch active user (Dev) 🛠️" : "Who are you? 👋"} onClose={onClose}>
      <p className="note lead">
        {isDev
          ? "Developer mode: tap any member to switch the active user."
          : "Tap your name. It will be saved as your global active user on this device."}
      </p>
      <div className="pick">
        {members.map((m) => (
          <button
            key={m.id}
            type="button"
            className={m.id === me ? "on" : ""}
            aria-pressed={m.id === me}
            onClick={() => onPick(m.id)}
          >
            {m.name}
          </button>
        ))}
      </div>
    </Sheet>
  );
}
