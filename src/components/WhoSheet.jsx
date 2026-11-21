import Sheet from "./Sheet.jsx";

export default function WhoSheet({ members, me, onPick, onClose, isDev = false }) {
  return (
    <Sheet onClose={onClose}>
      <h2>{isDev ? "Switch active user (Dev) 🛠️" : "Who are you? 👋"}</h2>
      <p className="note" style={{ marginTop: -6 }}>
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
            onClick={() => onPick(m.id)}
          >
            {m.name}
          </button>
        ))}
      </div>
    </Sheet>
  );
}
