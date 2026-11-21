export const inr = (n) => {
  const r = Math.round(n || 0);
  return (r < 0 ? "−₹" : "₹") + Math.abs(r).toLocaleString("en-IN");
};

/** Budget vs estimated vs actual, overall and per category (largest first). */
export function budgetSummary(trip, stats) {
  const estimated = Object.keys(trip.categories).reduce((a, k) => a + (trip.estimates[k] || 0), 0);
  const budget = estimated > 0 ? estimated : (trip.budget || 0);
  const actual = stats.total;
  const names = [...new Set([...Object.keys(trip.categories), ...Object.keys(stats.byCat)])];
  const rows = names
    .map((name) => ({ name, icon: trip.categories[name] || "📌", est: trip.estimates[name] || 0, act: stats.byCat[name] || 0 }))
    .filter((r) => r.est > 0 || r.act > 0)
    .sort((a, b) => Math.max(b.est, b.act) - Math.max(a.est, a.act));
  return { budget, estimated, actual, remaining: budget - actual, rows };
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

/**
 * Categories of the counted expenses (amount > 0, valid payer — same rule as compute()) that
 * `memberId` is split into, whoever paid. Used to scope the Budget chart to the active user.
 */
export function sharedCategories(memberId, members, expenses) {
  const ids = members.map((m) => m.id);
  const valid = new Set(ids);
  const out = new Set();
  for (const e of expenses) {
    if ((Number(e.amount) || 0) <= 0 || !valid.has(e.paidBy)) continue;
    let split = (Array.isArray(e.split) ? e.split : ids).filter((id) => valid.has(id));
    if (!split.length) split = ids;
    if (split.includes(memberId)) out.add(e.category || "Other");
  }
  return out;
}

/** Direct pairwise settle-up: net debts between pairs who actually shared expenses. Returns [from, to, amount][]. */
export function settle(members, expensesOrBal) {
  if (!Array.isArray(expensesOrBal)) return [];
  const expenses = expensesOrBal;
  const ids = members.map((m) => m.id);
  const memberSet = new Set(ids);
  const debt = {};
  ids.forEach((i) => {
    debt[i] = {};
    ids.forEach((j) => { debt[i][j] = 0; });
  });

  for (const e of expenses) {
    const a = Number(e.amount) || 0;
    if (a <= 0) continue;
    const payer = e.paidBy;
    if (!payer || !memberSet.has(payer)) continue;
    let split = (Array.isArray(e.split) ? e.split : ids).filter((id) => memberSet.has(id));
    if (!split.length) split = ids;
    const shareAmount = a / split.length;
    for (const borrower of split) {
      if (borrower !== payer) {
        debt[borrower][payer] = (debt[borrower][payer] || 0) + shareAmount;
      }
    }
  }

  const out = [];
  for (let i = 0; i < ids.length; i++) {
    for (let j = i + 1; j < ids.length; j++) {
      const idA = ids[i], idB = ids[j];
      const diff = (debt[idA][idB] || 0) - (debt[idB][idA] || 0);
      const rounded = Math.round(diff);
      if (rounded > 0) {
        out.push([idA, idB, rounded]);
      } else if (rounded < 0) {
        out.push([idB, idA, -rounded]);
      }
    }
  }
  out.sort((a, b) => b[2] - a[2]);
  return out;
}
