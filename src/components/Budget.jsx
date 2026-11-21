import { inr } from "../lib/money.js";

// Meter on a shared scale: the light track is the estimate (or budget), the solid
// fill is what was actually spent. Past the estimate the fill turns red and a tick
// marks where the estimate was.
function Meter({ est, act, scale }) {
  const w = (v) => (scale > 0 ? (v / scale) * 100 : 0) + "%";
  const over = est > 0 && act > est;
  let cls = "";
  if (!est) cls = "unplanned";
  else if (over) cls = "over";
  return (
    <div className="meter" aria-hidden="true">
      {est > 0 && <div className="track" style={{ width: w(est) }} />}
      {act > 0 && <div className={`fill ${cls}`} style={{ width: w(act) }} />}
      {over && <div className="tick" style={{ left: `calc(${w(est)} - 1px)` }} />}
    </div>
  );
}

function rowStatus(est, act, what = "estimate") {
  if (!est) return { cls: "unplanned", text: "⚠ Not in the estimates" };
  if (act > est) return { cls: "over", text: `⚠ ${inr(act - est)} over ${what}` };
  if (!act) return { cls: "", text: "Nothing spent yet" };
  return { cls: "", text: `${Math.round((act / est) * 100)}% used · ${inr(est - act)} left` };
}

function Row({ r, scale }) {
  const s = rowStatus(r.est, r.act);
  const label = `${r.name}: estimated ${r.est ? inr(r.est) : "nothing"}, spent ${inr(r.act)}. ${s.text.replace("⚠ ", "")}`;
  return (
    <div className="brow" title={label} aria-label={label} role="group">
      <div className="bhead">
        <span className="n">{r.icon} {r.name}</span>
        <span className="v">{inr(r.act)} <small>/ {r.est ? inr(r.est) : "—"}</small></span>
      </div>
      <Meter est={r.est} act={r.act} scale={scale} />
      <div className={`bsub ${s.cls}`}>{s.text}</div>
    </div>
  );
}

export default function Budget({ sum, canEdit, onEdit }) {
  const { budget, estimated, actual, rows } = sum;
  const scale = Math.max(1, ...rows.map((r) => Math.max(r.est, r.act)));
  const overall = rowStatus(budget, actual, "budget");
  const empty = !budget && !estimated && !actual;

  let planNote = "";
  if (budget && estimated > 0 && estimated > budget) {
    planNote = `Estimates add up to ${inr(estimated)} — ${inr(estimated - budget)} more than the budget.`;
  } else if (budget && estimated > 0 && budget > estimated) {
    planNote = `Estimates add up to ${inr(estimated)} — ${inr(budget - estimated)} under the budget.`;
  }

  return (
    <section>
      {empty ? (
        <div className="card empty">
          Set a total budget and an estimate for each category, then compare them with what you actually spend.
        </div>
      ) : (
        <>
          <div className="card">
            <div className="bhead">
              <h3>Budget used</h3>
              <span className="v">{inr(actual)} <small>of {budget ? inr(budget) : "—"}</small></span>
            </div>
            {budget > 0 ? (
              <>
                <Meter est={budget} act={actual} scale={Math.max(budget, actual)} />
                <div className={`bsub ${overall.cls}`}>{overall.text}</div>
              </>
            ) : (
              <p className="note">No total budget set yet.</p>
            )}
            {planNote && <p className={`note ${estimated > budget ? "warn" : ""}`}>{planNote}</p>}
          </div>

          <div className="card">
            <h3>Estimated vs actual</h3>
            <p className="note" style={{ margin: "2px 0 0" }}>By category, largest first.</p>
            <div className="legend">
              <span><i className="sw act" />Actual</span>
              <span><i className="sw est" />Estimated</span>
              <span><i className="sw over" />Over estimate</span>
            </div>
            {rows.length ? rows.map((r) => <Row key={r.name} r={r} scale={scale} />)
              : <div className="empty">No estimates or spending yet</div>}
          </div>
        </>
      )}
      <button className="btn ghost wide" disabled={!canEdit} onClick={onEdit}>✏️ Edit budget &amp; estimates</button>
    </section>
  );
}
