import { useEffect, useRef, useState } from "react";
import { inr } from "../lib/money.js";

// Estimated vs actual per category, as two overlapping (not stacked) areas.
// x = categories (in the order given), y = ₹. The estimate is a dashed blue line over a
// light wash; actual is a solid green line over a stronger wash. Points over their estimate
// are red triangles, points with no estimate are gold diamonds (shape + colour, never colour
// alone). Hover, tap or arrow keys show one category's figures; the list under the chart
// carries every value in words, so nothing is reachable only through the tooltip.

const PLOT_H = 190;
const PAD = { top: 12, right: 14, left: 46 };

/** Round axis ticks from 0 up to just above `max` (about 4 steps). */
function niceTicks(max) {
  const raw = max / 4;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => s >= raw);
  const ticks = [];
  for (let v = 0; v < max + step; v += step) ticks.push(v);
  return ticks;
}

/** One unit for the whole axis: lakh, thousand, or full rupees. */
function tickFormat(top) {
  const trim = (n) => String(Number(n.toFixed(1)));
  if (top >= 1e5) return (v) => (v ? `₹${trim(v / 1e5)}L` : "₹0");
  if (top >= 1e4) return (v) => (v ? `₹${trim(v / 1e3)}K` : "₹0");
  return (v) => inr(v);
}

function useWidth(ref) {
  const [w, setW] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    setW(el.clientWidth);
    if (typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(([e]) => setW(Math.round(e.contentRect.width)));
    ro.observe(el);
    return () => ro.disconnect();
  }, [ref]);
  return w;
}

function kind(r) {
  if (!r.est && r.act > 0) return "unplanned";
  if (r.est > 0 && r.act > r.est) return "over";
  return "";
}

/** Actual-value marker: circle, or a triangle (over) / diamond (not estimated). */
function ActMark({ x, y, k, big }) {
  const s = big ? 7.5 : 6;
  if (k === "over") return <path className="ch-dot over" d={`M${x},${y - s - 1}L${x + s},${y + s - 1}L${x - s},${y + s - 1}Z`} />;
  if (k === "unplanned") return <path className="ch-dot unplanned" d={`M${x},${y - s}L${x + s},${y}L${x},${y + s}L${x - s},${y}Z`} />;
  return <circle className="ch-dot act" cx={x} cy={y} r={big ? 5.5 : 4.5} />;
}

export default function BudgetAreaChart({ rows, statusOf }) {
  const wrap = useRef(null);
  const width = useWidth(wrap);
  const [active, setActive] = useState(null);
  const n = rows.length;

  // a tap elsewhere hides the readout (touch has no "pointer left")
  useEffect(() => {
    if (active == null) return;
    const off = (e) => { if (!wrap.current?.contains(e.target)) setActive(null); };
    document.addEventListener("pointerdown", off);
    return () => document.removeEventListener("pointerdown", off);
  }, [active]);

  const plotW = Math.max(0, width - PAD.left - PAD.right);
  const band = n ? plotW / n : 0;
  // category names under the icons only when every one fits its column
  const showNames = rows.every((r) => r.name.length * 6.4 + 8 <= band);
  const bottom = showNames ? 42 : 30;
  const height = PAD.top + PLOT_H + bottom;

  const max = Math.max(1, ...rows.map((r) => Math.max(r.est, r.act)));
  const ticks = niceTicks(max);
  const top = ticks.at(-1);
  const fmt = tickFormat(top);
  const x = (i) => PAD.left + band * (i + 0.5);
  const y = (v) => PAD.top + PLOT_H - (v / top) * PLOT_H;
  const base = y(0);

  const linePath = (key) => rows.map((r, i) => `${i ? "L" : "M"}${x(i)},${y(r[key])}`).join("");
  const areaPath = (key) => `${linePath(key)}L${x(n - 1)},${base}L${x(0)},${base}Z`;

  const pick = (e) => {
    const box = wrap.current.getBoundingClientRect();
    const i = Math.floor((e.clientX - box.left - PAD.left) / band);
    setActive(Math.min(n - 1, Math.max(0, i)));
  };
  const onKey = (e) => {
    const moves = { ArrowRight: 1, ArrowLeft: -1 };
    if (e.key in moves) {
      e.preventDefault();
      setActive((a) => Math.min(n - 1, Math.max(0, (a ?? -moves[e.key]) + moves[e.key])));
    } else if (e.key === "Home") { e.preventDefault(); setActive(0); }
    else if (e.key === "End") { e.preventDefault(); setActive(n - 1); }
    else if (e.key === "Escape") setActive(null);
  };

  const cur = active != null ? rows[active] : null;
  const curStatus = cur ? statusOf(cur) : null;
  const tipRight = active != null && x(active) > width / 2;

  return (
    <div
      ref={wrap} className="chart" tabIndex={0} role="group" onKeyDown={onKey}
      aria-label="Chart of estimated and actual spend by category. Use the left and right arrow keys to read each category; every value is also listed below."
      onFocus={() => setActive((a) => a ?? 0)}
      onBlur={() => setActive(null)}
    >
      {width > 0 && n > 0 && (
        <svg width={width} height={height} aria-hidden="true">
          {ticks.map((t) => (
            <g key={t}>
              <line className={t ? "ch-grid" : "ch-base"} x1={PAD.left} x2={width - PAD.right} y1={y(t)} y2={y(t)} />
              <text className="ch-tick" x={PAD.left - 8} y={y(t)} dy="0.35em" textAnchor="end">{fmt(t)}</text>
            </g>
          ))}

          <path className="ch-area est" d={areaPath("est")} />
          <path className="ch-area act" d={areaPath("act")} />
          <path className="ch-line est" d={linePath("est")} />
          <path className="ch-line act" d={linePath("act")} />

          {active != null && <line className="ch-cross" x1={x(active)} x2={x(active)} y1={PAD.top} y2={base} />}

          {rows.map((r, i) => (
            <g key={r.name}>
              <circle className="ch-dot est" cx={x(i)} cy={y(r.est)} r={i === active ? 5 : 4} />
              <ActMark x={x(i)} y={y(r.act)} k={kind(r)} big={i === active} />
              <text className="ch-icon" x={x(i)} y={base + 19} textAnchor="middle">{r.icon}</text>
              {showNames && <text className={`ch-x ${i === active ? "on" : ""}`} x={x(i)} y={base + 35} textAnchor="middle">{r.name}</text>}
            </g>
          ))}

          <rect
            className="ch-hit" x={PAD.left} y={0} width={plotW} height={height}
            onPointerDown={pick} onPointerMove={pick}
            onPointerLeave={(e) => { if (e.pointerType === "mouse") setActive(null); }}
          />
        </svg>
      )}

      <div
        className={`ctip ${cur ? "on" : ""} ${tipRight ? "left" : ""}`}
        style={cur ? { left: x(active) + (tipRight ? -12 : 12) } : undefined}
        role="status" aria-live="polite"
      >
        {cur && (
          <>
            <div className="ctip-h">{cur.icon} {cur.name}</div>
            <div className="ctip-r"><i className="key act" /><b>{inr(cur.act)}</b> actual</div>
            <div className="ctip-r"><i className="key est" /><b>{cur.est ? inr(cur.est) : "—"}</b> estimated</div>
            <div className={`ctip-s ${curStatus.cls}`}>{curStatus.text}</div>
          </>
        )}
      </div>
    </div>
  );
}
