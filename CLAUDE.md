# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Pocket Trip Planner (`pocket_trip_planner`): a mobile-first React 18 + Vite single-page app for group trips — itinerary, per-category budget vs actual, shared expenses and settle-up. There is no backend of our own: the browser talks directly to Firebase Firestore, and the static build is hosted on GitHub Pages.

## Commands

```bash
npm install        # Node 22.12+ (Vite 8); CI uses Node 24
npm run dev        # dev server on http://localhost:5173
npm run build      # production build to dist/ (the only automated check — there is no linter or test suite)
npm run preview    # serve dist/
```

Deploy: every push to `main` (including a merged pull request) runs `.github/workflows/deploy.yml` (npm ci → build → GitHub Pages). `vite.config.js` uses `base: "./"` so the build works under any Pages sub-path.

Git: the repo is `himanshupsingh-dev/pocket_trip_planner` and `main` is protected by a ruleset — direct pushes and force pushes to `main` are rejected for everyone. Work on a branch, push the branch, and open a pull request; never try to push to `main`. The `gh` CLI is not installed on this machine, so pull requests are opened on github.com.

Dependencies: Vite 8 needs `@vitejs/plugin-react` 6.x (4.x/5.1 reject Vite 8 as a peer, which makes CI's `npm ci` fail even when local installs work). **Never run `npm audit fix --force`** — it downgrades `firebase` to 9.14 and jumps majors, which broke the deploy once. The remaining `npm audit` findings (`@grpc/grpc-js` via `@firebase/firestore`) are Node-only and not in the browser bundle.

Lockfile gotcha: npm on Windows (with `node_modules` present) drops `@emnapi/core` / `@emnapi/runtime` — deps of Vite 8's optional `@rolldown/binding-wasm32-wasi` — from `package-lock.json`. CI's newer npm then fails `npm ci` with `EUSAGE … Missing: @emnapi/… from lock file`. Fix: copy `package.json` + `package-lock.json` into an empty folder, delete the lock there, run `npm install --package-lock-only`, copy the new lock back, and confirm `npm ci --os=linux --cpu=x64 --dry-run` passes. After any `npm install <pkg>`, check `package-lock.json` still has `"node_modules/@emnapi/core"`.

`firestore.rules` is **not** deployed by any script — after changing it, the rules must be pasted into Firebase console → Firestore → Rules → Publish.

## Hard constraints

- **Everything must stay free.** Firebase Spark plan only (Firestore Standard edition; no Storage, Functions, phone auth or anything that needs Blaze), free GitHub Pages hosting. Don't add services or dependencies that need billing.
- **Access model is "private link, no login".** Trip ids are unguessable (`newTripId()` → `slug-<10 random chars>`); the rules allow `get` but not `list` on `trips`, and no deletes of trips. Anyone with a trip's link can read and edit it. Don't add a feature that lists or queries across trips (that would leak every trip), and keep collection-group queries off.
- `src/firebase-config.js` holds the Firebase *web* config and is committed on purpose (it's public by design; the rules are the security boundary). When it still contains `PASTE…` placeholders, `isConfigured` is false and the app runs read-only from built-in templates.

## Architecture

**Routing** (`src/App.jsx`): hash-based. `#/` → `pages/Home.jsx`; `#/<tripId>/<view>` → `pages/TripPage.jsx`, with `view` ∈ plan | checklist | expenses | budget | settle. `TripPage` is keyed by tripId so state resets between trips.

**Firestore layout** (all access in `src/lib/db.js`):
- `trips/{tripId}` — title, emoji, subtitle, startDate, endDate, budget, `estimates` (map category→₹), `members` [{id,name}], `categories` [{name,icon}], places, defaultPlace, planNote, `checklist` [{id, text, date, done, createdAt}]
- `trips/{tripId}/expenses/{id}` — desc, amount, date, category, place, paidBy (member id), split (member ids), createdAt
- `trips/{tripId}/days/{id}` — date, title, route, stay, nostay, badge, note, `groups` [{h, items[]}], createdAt
- `trips/{tripId}/checklist/{id}` — text, date (`YYYY-MM-DD`), done (boolean), createdAt. Shared pending checklist: not user-specific; anyone with access can view, add, toggle done, edit text/date, and delete entries. Displayed ordered in ascending order of the date.

Firestore cannot store nested arrays, so groups and categories are arrays of objects; categories are an array (not a map) to keep their order. Firestore is initialised with `ignoreUndefinedProperties`.

**Trip object pipeline:** raw doc fields → `normalizeTrip(id, data)` in `src/trips/index.js` → the `trip` object every component receives. After normalization `trip.categories` is an ordered `{name: icon}` object and defaults are filled in — components rely on this, so always go through `normalizeTrip`.

**Built-in templates** (`src/trips/*.js`, registered in `src/trips/index.js`): a template's `id` is its trip id. The first time a template trip is opened and Firestore reports the doc missing, `seedTrip()` writes the trip, its days and seed expenses in one batch; afterwards the database is the source of truth and the template file is no longer read for that trip. Until Firestore answers (or when unconfigured), `TripPage` renders the template directly. Editing a template file does not change an already-seeded trip.

**TripPage** owns all live subscriptions (`watchTrip`, `watchList(…,"expenses")`, `watchList(…,"days")`, `watchList(…,"checklist")`) and a single `sheet` state (`{type: "exp"|"who"|"trip"|"share"|"day"|"budget"|"task", …}`) that decides which bottom sheet (`components/*Sheet.jsx`) is open. Editing is enabled only when `canEdit = isConfigured && dbTrip`.

**Device-only state** (`src/lib/device.js`, localStorage): the default device user name (`ptp-user-name`, selected via member buttons when entering a trip page for the first time, never prompted on homepage), the list of trips created/opened on this device (what Home shows, plus unseeded templates), the "who are you" member id per trip (`ptp-me:<tripId>`), and the global developer mode flag (`ptp-dev-mode`, default false / inactive; unlocked with password on homepage, exposed via `isDevMode()`, `setDevMode()`, and `window.__DEV_MODE__`). Switching active user identity is strictly restricted to Developer Mode; normal users are bound to their device name. Never stored in Firestore.

**Money rules** (`src/lib/money.js`):
- **Amounts are exact to 2 decimal places (paise).** All sums and splits run in integer paise (`toPaise()`), and results come back in rupees with ≤ 2 decimals — never add raw rupee floats (0.1 + 0.2 drift); use `toPaise`/`round2`. Inputs (expense amount, estimates, trip budget) are `step="0.01"` and saved through `round2()`. `inr()` prints whole rupees as `₹1,000` and anything with paise as `₹1,234.50`. Percentages stay whole numbers.
- An uneven split gives the leftover paise one each to the first ids in the split (₹100 / 3 → 33.34, 33.33, 33.33), so shares always sum exactly to the expense; `compute()` and `settle()` share this `splitPaise()` so balances and settle-up transfers agree to the paisa.
- `compute()` skips expenses with no valid payer; shares are equal splits over `split` ids that are still members.
- A new expense's payer is the current device's member; editing keeps the original payer; an unfilled row (amount 0, no payer — e.g. seeded hotels) is claimed by whoever fills it and its split defaults to all current members. Only the person who paid for an expense (`exp.paidBy === me`) can edit or delete it; other members can only view its details.
- `settle()` is a direct pairwise settlement of debts between members who shared expenses (netting out mutual debts per pair, replacing greedy multi-party routing). In `Settle.jsx`, settlements and balances are scoped to the active user (`me`): only transfers involving the active user are shown, and unpaid balances between other group members are hidden.
- `budgetSummary(trip, stats, cats?)`: Budget = sum of per-category estimates (falls back to trip.budget if unestimated) — so Budget and Estimated are the same number whenever estimates exist, which is why there is no separate "Estimated" tile; Actual = total of paid expenses; Remaining = budget − actual. `rows` always lists every category. Pass `cats` (from `sharedCategories(me, …)`) to total only those categories — still group amounts — with `scope: "mine"`; with no `cats`, or a trip-wide budget and no category estimates (can't be split by category), it stays whole-trip, `scope: "trip"`.
- The KPI tiles (every tab) and the Budget tab's "Budget used" card use the scoped summary (`mySum` in `TripPage`): Budget / Actual / Remaining for the active user's categories, labelled "your categories" or "whole trip", plus a **Your share** tile (`stats.share[me]`, same figure as Settle → Your balance). A category with an estimate but no expense the user is split into doesn't count toward their Budget until they share an expense there.
- `TripSheet` blocks removing a member who is payer/splitter on any expense with amount > 0. Categories can be added or removed in `BudgetSheet` and `TripSheet`; removing a category is blocked if any expense with amount > 0 uses it.

**Dates** are stored as `YYYY-MM-DD` strings; weekdays and "Day N" labels are computed at render time (`src/lib/dates.js`, `Plan.jsx` sorts days by date then createdAt). Currency is INR only, formatted by `inr()`.

**Styling**: plain CSS in `src/styles.css`; no UI library. Every colour is a token on `:root` (green accent, gold = warning, red = over/critical, plus `--field`, `--on-green`, `--goldink`, …) and a `prefers-color-scheme: dark` block redefines them — so the app follows the phone's light/dark setting. Use tokens, never hard-coded colours (the hero/top bar are the only places with literal white text). The Budget tab's "Budget used" card is a CSS meter (track = budget, fill = actual, red + tick when over), scoped like the tiles. Its "Estimated vs actual" card is scoped to the active user: only categories where `me` is in the split of at least one counted expense (`sharedCategories()` in `money.js` — amount > 0 and a valid payer, same rule as `compute()`; paying for others without being in the split doesn't count), but plotted as **group** totals; with no active user it asks them to pick their name. The chart is inline SVG (`components/BudgetAreaChart.jsx`, no chart library): x = categories (largest first), y = ₹, estimate and actual as two **overlapping, not stacked** areas — stacking would add estimate + actual into a meaningless total. Series colours are `--c-est` (blue, dashed line) / `--c-act` (green), validated for colour-blind separation in both modes; over-estimate points are red triangles and unestimated ones gold diamonds (shape + colour). Hover, tap or arrow keys show a readout; the category list under the chart repeats every value and status in words, so nothing relies on colour or on the tooltip alone. Settlement transfers use green (`var(--ok)`) for received payments and red (`var(--red)`) for owed payments. Animations are disabled under `prefers-reduced-motion`.

**Layout pieces**: the trip hero is full-size on Plan and `.compact` on the other tabs; a slim `.topbar` slides in (IntersectionObserver on the trip title) once the title scrolls away. Expenses lists only the expenses the active user is part of — they paid for it or are in its split (`isPartOf()` in `money.js`; paying only for others still counts, since only the payer can edit or delete it); with no active user it asks them to pick their name. It has a floating "Add expense" button (`.fab`), chip filters that only list payers/categories present in that list, and groups rows by date with a per-day total. Plan is a timeline (`ol.timeline`) whose node shows the day number, ✓ for past days, and highlights/auto-opens today (`todayISO()` in `dates.js` — local time, don't use `toISOString()` for "today").

**Sheets** (`components/Sheet.jsx`): pass the heading as `title` (it labels the dialog) rather than an `<h2>` child. It's a `role="dialog"` with focus moved in and restored on close, Tab trapped, body scroll locked; when `onClose` is given it also closes on backdrop tap, Escape, the × button or a swipe down on the header. Without `onClose` (first-visit WhoSheet) it can't be dismissed. Clickable rows and toggles are real `<button>`s (`aria-pressed` / `aria-expanded`), not divs.

## Testing UI changes without touching real data

There is no test suite. To click through flows without writing to the real Firestore, create a temporary Vite config that aliases the import `../lib/db.js` to an in-memory mock exporting the same functions (`isConfigured`, `watchTrip`, `watchList`, `createTrip`, `updateTrip`, `saveExpense`, `deleteExpense`, `saveDay`, `deleteDay`, `seedTrip`), run `npx vite --config <that file>`, and delete both files afterwards.
