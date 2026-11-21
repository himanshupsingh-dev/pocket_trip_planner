export const inr = (n) => {
  const r = Math.round(n || 0);
  return (r < 0 ? "−₹" : "₹") + Math.abs(r).toLocaleString("en-IN");
};

/** Budget vs estimated vs actual, overall and per category (largest first). */
export function budgetSummary(trip, stats) {
  const estimated = Object.keys(trip.categories).reduce((a, k) => a + (trip.estimates[k] || 0), 0);
  const actual = stats.total;
  const names = [...new Set([...Object.keys(trip.categories), ...Object.keys(stats.byCat)])];
  const rows = names
    .map((name) => ({ name, icon: trip.categories[name] || "📌", est: trip.estimates[name] || 0, act: stats.byCat[name] || 0 }))
    .filter((r) => r.est > 0 || r.act > 0)
    .sort((a, b) => Math.max(b.est, b.act) - Math.max(a.est, a.act));
  return { budget: trip.budget, estimated, actual, remaining: trip.budget - actual, rows };
}

/** Totals, per-person paid/share/balance. Expenses without a valid payer are skipped. */
export function compute(members, expenses) {
  const ids = members.map((m) => m.id);
  const paid = {}, share = {};
  ids.forEach((id) => { paid[id] = 0; share[id] = 0; });
  let total = 0, unpaidTotal = 0;
  const byCat = {}, byPlace = {};

  for (const e of expenses) {
    const a = Number(e.amount) || 0;
    if (a <= 0) continue;
    if (!e.paidBy || paid[e.paidBy] === undefined) { unpaidTotal += a; continue; }
    total += a;
    paid[e.paidBy] += a;
    let split = (Array.isArray(e.split) ? e.split : ids).filter((id) => share[id] !== undefined);
    if (!split.length) split = ids;
    split.forEach((id) => { share[id] += a / split.length; });
    const c = e.category || "Other", p = e.place || "On the way";
    byCat[c] = (byCat[c] || 0) + a;
    byPlace[p] = (byPlace[p] || 0) + a;
  }
  const bal = {};
  ids.forEach((id) => { bal[id] = paid[id] - share[id]; });
  return { paid, share, bal, total, unpaidTotal, byCat, byPlace };
}

/** Greedy settle-up: fewest transfers from debtors to creditors. Returns [from, to, amount][]. */
export function settle(members, bal) {
  const cr = [], dr = [];
  members.forEach((m) => {
    const b = Math.round(bal[m.id] || 0);
    if (b > 0) cr.push([m.id, b]); else if (b < 0) dr.push([m.id, -b]);
  });
  cr.sort((a, b) => b[1] - a[1]);
  dr.sort((a, b) => b[1] - a[1]);
  const out = [];
  let i = 0, j = 0;
  while (i < dr.length && j < cr.length) {
    const x = Math.min(dr[i][1], cr[j][1]);
    if (x > 0) out.push([dr[i][0], cr[j][0], x]);
    dr[i][1] -= x; cr[j][1] -= x;
    if (dr[i][1] <= 0) i++;
    if (cr[j][1] <= 0) j++;
  }
  return out;
}
