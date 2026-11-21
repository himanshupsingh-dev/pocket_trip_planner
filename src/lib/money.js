// Money is exact to 2 decimal places (paise). Every sum and split below is done in whole
// paise (integers), so floating-point drift like 0.1 + 0.2 = 0.30000000000000004 never
// reaches a total, and results are handed back in rupees with at most 2 decimals.

/** Rupees → whole paise, rounding half away from zero (1.005 → 101, −1.005 → −101). */
export function toPaise(n) {
  const v = Number(n) || 0;
  return Math.sign(v) * Math.round(Number((Math.abs(v) * 100).toFixed(6)));
}

/** Round rupees to 2 decimal places. */
export const round2 = (n) => toPaise(n) / 100;

/** "₹1,234" for whole rupees, "₹1,234.50" when there are paise; "−₹…" when negative. */
export const inr = (n) => {
  const p = toPaise(n);
  const abs = Math.abs(p);
  const frac = abs % 100 ? 2 : 0;
  const s = (abs / 100).toLocaleString("en-IN", { minimumFractionDigits: frac, maximumFractionDigits: frac });
  return (p < 0 ? "−₹" : "₹") + s;
};

/** The member ids an expense is split between: its `split` limited to current members (everyone if none left). */
function splitIds(e, ids, valid) {
  const s = [...new Set((Array.isArray(e.split) ? e.split : ids).filter((id) => valid.has(id)))];
  return s.length ? s : ids;
}

/** The member ids an expense is split between — current members only, everyone if none are left (as compute() counts it). */
export function splitMembers(e, members) {
  const ids = members.map((m) => m.id);
  return splitIds(e, ids, new Set(ids));
}

/** Whether `memberId` paid for the expense or is in its split: the expenses the Expenses list shows them. */
export const isPartOf = (e, memberId, members) =>
  e.paidBy === memberId || splitMembers(e, members).includes(memberId);

/**
 * Split `paise` equally between `ids`; the leftover paise (fewer than ids.length) go one each
 * to the first ids, so the shares always add up exactly to the expense.
 * e.g. 10000 paise (₹100) over 3 → 3334, 3333, 3333.
 */
function splitPaise(paise, ids) {
  const base = Math.floor(paise / ids.length);
  let rem = paise - base * ids.length;
  const out = {};
  for (const id of ids) { out[id] = base + (rem > 0 ? 1 : 0); rem -= 1; }
  return out;
}

/**
 * Budget vs estimated vs actual, overall and per category (largest first; `rows` always lists every category).
 * With `cats` (a Set of category names, e.g. from sharedCategories()) the totals cover only those
 * categories — group amounts, not personal shares — and `scope` is "mine". A trip-wide budget with no
 * category estimates can't be split by category, so that case (and no `cats`) stays whole-trip: `scope` "trip".
 */
export function budgetSummary(trip, stats, cats = null) {
  const names = [...new Set([...Object.keys(trip.categories), ...Object.keys(stats.byCat)])];
  const rows = names
    .map((name) => ({ name, icon: trip.categories[name] || "📌", est: round2(trip.estimates[name] || 0), act: stats.byCat[name] || 0 }))
    .filter((r) => r.est > 0 || r.act > 0)
    .sort((a, b) => Math.max(b.est, b.act) - Math.max(a.est, a.act));
  const sumP = (list, key) => list.reduce((a, r) => a + toPaise(r[key]), 0);
  const estimatedAllP = Object.keys(trip.categories).reduce((a, k) => a + toPaise(trip.estimates[k] || 0), 0);
  const mine = !!cats && (estimatedAllP > 0 || !trip.budget);
  if (!mine) {
    const budgetP = estimatedAllP > 0 ? estimatedAllP : toPaise(trip.budget || 0);
    const actualP = toPaise(stats.total);
    return {
      budget: budgetP / 100, estimated: estimatedAllP / 100, actual: actualP / 100,
      remaining: (budgetP - actualP) / 100, rows, scope: "trip",
    };
  }
  const inScope = rows.filter((r) => cats.has(r.name));
  const estP = sumP(inScope, "est"), actP = sumP(inScope, "act");
  return { budget: estP / 100, estimated: estP / 100, actual: actP / 100, remaining: (estP - actP) / 100, rows, scope: "mine" };
}

/** Totals, per-person paid/share/balance (all in rupees, exact to the paisa). Expenses without a valid payer are skipped. */
export function compute(members, expenses) {
  const ids = members.map((m) => m.id);
  const valid = new Set(ids);
  const paid = {}, share = {};
  ids.forEach((id) => { paid[id] = 0; share[id] = 0; });
  let total = 0, unpaidTotal = 0;
  const byCat = {}, byPlace = {};

  for (const e of expenses) {
    const a = toPaise(e.amount);
    if (a <= 0) continue;
    if (!e.paidBy || !valid.has(e.paidBy)) { unpaidTotal += a; continue; }
    total += a;
    paid[e.paidBy] += a;
    const parts = splitPaise(a, splitIds(e, ids, valid));
    for (const id in parts) share[id] += parts[id];
    const c = e.category || "Other", p = e.place || "On the way";
    byCat[c] = (byCat[c] || 0) + a;
    byPlace[p] = (byPlace[p] || 0) + a;
  }

  const rupees = (o) => Object.fromEntries(Object.entries(o).map(([k, v]) => [k, v / 100]));
  const bal = {};
  ids.forEach((id) => { bal[id] = (paid[id] - share[id]) / 100; });
  return {
    paid: rupees(paid), share: rupees(share), bal,
    total: total / 100, unpaidTotal: unpaidTotal / 100,
    byCat: rupees(byCat), byPlace: rupees(byPlace),
  };
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
    if (toPaise(e.amount) <= 0 || !valid.has(e.paidBy)) continue;
    if (splitIds(e, ids, valid).includes(memberId)) out.add(e.category || "Other");
  }
  return out;
}

/**
 * Direct pairwise settle-up: net debts between pairs who actually shared expenses, using the same
 * paisa-exact shares as compute(). Returns [from, to, amount in rupees][].
 */
export function settle(members, expensesOrBal) {
  if (!Array.isArray(expensesOrBal)) return [];
  const expenses = expensesOrBal;
  const ids = members.map((m) => m.id);
  const valid = new Set(ids);
  const debt = {};
  ids.forEach((i) => {
    debt[i] = {};
    ids.forEach((j) => { debt[i][j] = 0; });
  });

  for (const e of expenses) {
    const a = toPaise(e.amount);
    if (a <= 0) continue;
    const payer = e.paidBy;
    if (!payer || !valid.has(payer)) continue;
    const parts = splitPaise(a, splitIds(e, ids, valid));
    for (const borrower in parts) {
      if (borrower !== payer) debt[borrower][payer] += parts[borrower];
    }
  }

  const out = [];
  for (let i = 0; i < ids.length; i++) {
    for (let j = i + 1; j < ids.length; j++) {
      const idA = ids[i], idB = ids[j];
      const diff = debt[idA][idB] - debt[idB][idA];
      if (diff > 0) out.push([idA, idB, diff / 100]);
      else if (diff < 0) out.push([idB, idA, -diff / 100]);
    }
  }
  out.sort((a, b) => b[2] - a[2]);
  return out;
}
