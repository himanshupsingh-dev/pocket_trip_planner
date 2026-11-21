import { inr } from "../lib/money.js";
import BudgetAreaChart from "./BudgetAreaChart.jsx";

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

const statusOf = (r) => rowStatus(r.est, r.act);

// One category in words, under the chart: the chart's table view.
function Row({ r }) {
  const s = statusOf(r);
  const label = `${r.name}: estimated ${r.est ? inr(r.est) : "nothing"}, spent ${inr(r.act)}. ${s.text.replace("⚠ ", "")}`;
  return (
    <div className="brow" title={label} aria-label={label} role="group">
      <div className="bhead">
        <span className="n">{r.icon} {r.name}</span>
        <span className="v">{inr(r.act)} <small>/ {r.est ? inr(r.est) : "—"}</small></span>
      </div>
      <div className={`bsub ${s.cls}`}>{s.text}</div>
    </div>
  );
}

// Legend keys mirror the marks: a wash with its line for the two areas, the marker shape for the two statuses.
const AreaKey = ({ k }) => <i className={`sw area ${k}`} />;
const ShapeKey = ({ k }) => (
  <svg className="swshape" viewBox="0 0 12 12" aria-hidden="true">
    {k === "over" ? <path className="ch-dot over" d="M6,1L11,10L1,10Z" /> : <path className="ch-dot unplanned" d="M6,1L11,6L6,11L1,6Z" />}
  </svg>
);

/**
 * `myCats`: the categories the active user is split into (null when nobody is selected).
 * The "Budget used" card is the whole group's; the chart and list show group totals for
 * only the active user's categories.
 */
export default function Budget({ sum, myCats, onSelectMe, canEdit, onEdit }) {
  const { budget, estimated, actual } = sum;
  const rows = myCats ? sum.rows.filter((r) => myCats.has(r.name)) : [];
  const anyOver = rows.some((r) => r.est > 0 && r.act > r.est);
  const anyUnplanned = rows.some((r) => !r.est && r.act > 0);
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
            <p className="note sub">Group totals for the categories you share expenses in, largest first.</p>
            {!myCats && (
              <div className="gap">
                <p className="note">Select who you are to see the categories you share expenses in.</p>
                {onSelectMe && <button type="button" className="btn ghost small" onClick={onSelectMe}>👤 Select your name</button>}
              </div>
            )}
            {myCats && !rows.length && <div className="empty">You aren't part of any expenses yet.</div>}
            {rows.length > 0 && (
              <>
                <div className="legend">
                  <span><AreaKey k="act" />Actual</span>
                  <span><AreaKey k="est" />Estimated</span>
                  {anyOver && <span><ShapeKey k="over" />Over estimate</span>}
                  {anyUnplanned && <span><ShapeKey k="unplanned" />Not estimated</span>}
                </div>
                <BudgetAreaChart rows={rows} statusOf={statusOf} />
                <div className="blist">{rows.map((r) => <Row key={r.name} r={r} />)}</div>
              </>
            )}
          </div>
        </>
      )}
      <button type="button" className="btn ghost wide" disabled={!canEdit} onClick={onEdit}>✏️ Edit budget &amp; estimates</button>
    </section>
  );
}
