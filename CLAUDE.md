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

**Routing** (`src/App.jsx`): hash-based. `#/` → `pages/Home.jsx`; `#/<tripId>/<view>` → `pages/TripPage.jsx`, with `view` ∈ plan | expenses | budget | settle. `TripPage` is keyed by tripId so state resets between trips.

**Firestore layout** (all access in `src/lib/db.js`):
- `trips/{tripId}` — title, emoji, subtitle, startDate, endDate, budget, `estimates` (map category→₹), `members` [{id,name}], `categories` [{name,icon}], places, defaultPlace, planNote
- `trips/{tripId}/expenses/{id}` — desc, amount, date, category, place, paidBy (member id), split (member ids), createdAt
- `trips/{tripId}/days/{id}` — date, title, route, stay, nostay, badge, note, `groups` [{h, items[]}], createdAt

Firestore cannot store nested arrays, so groups and categories are arrays of objects; categories are an array (not a map) to keep their order. Firestore is initialised with `ignoreUndefinedProperties`.

**Trip object pipeline:** raw doc fields → `normalizeTrip(id, data)` in `src/trips/index.js` → the `trip` object every component receives. After normalization `trip.categories` is an ordered `{name: icon}` object and defaults are filled in — components rely on this, so always go through `normalizeTrip`.

**Built-in templates** (`src/trips/*.js`, registered in `src/trips/index.js`): a template's `id` is its trip id. The first time a template trip is opened and Firestore reports the doc missing, `seedTrip()` writes the trip, its days and seed expenses in one batch; afterwards the database is the source of truth and the template file is no longer read for that trip. Until Firestore answers (or when unconfigured), `TripPage` renders the template directly. Editing a template file does not change an already-seeded trip.

**TripPage** owns all live subscriptions (`watchTrip`, `watchList(…,"expenses")`, `watchList(…,"days")`) and a single `sheet` state (`{type: "exp"|"who"|"trip"|"share"|"day"|"budget", …}`) that decides which bottom sheet (`components/*Sheet.jsx`) is open. Editing is enabled only when `canEdit = isConfigured && dbTrip`.

**Device-only state** (`src/lib/device.js`, localStorage): the list of trips created/opened on this device (what Home shows, plus unseeded templates) and the "who are you" member id per trip (`ptp-me:<tripId>`). Never stored in Firestore.

**Money rules** (`src/lib/money.js`):
- `compute()` skips expenses with no valid payer; shares are equal splits over `split` ids that are still members.
- A new expense's payer is the current device's member; editing keeps the original payer; an unfilled row (amount 0, no payer — e.g. seeded hotels) is claimed by whoever fills it and its split defaults to all current members.
- `settle()` is a greedy fewest-transfers match of debtors to creditors.
- `budgetSummary()`: Budget = sum of per-category estimates (falls back to trip.budget if unestimated); Estimated = sum of per-category estimates; Actual = total of paid expenses; Remaining = budget − actual.
- `TripSheet` blocks removing a member who is payer/splitter on any expense with amount > 0.

**Dates** are stored as `YYYY-MM-DD` strings; weekdays and "Day N" labels are computed at render time (`src/lib/dates.js`, `Plan.jsx` sorts days by date then createdAt). Currency is INR only, formatted by `inr()`.

**Styling**: plain CSS in `src/styles.css` with tokens on `:root` (green accent, gold = warning, red = over/critical); no UI library, light theme only. The Budget tab's chart is a CSS meter list (track = estimate, fill = actual, red + tick when over, gold when unestimated) — every status also has a text label, so it never relies on colour alone.

## Testing UI changes without touching real data

There is no test suite. To click through flows without writing to the real Firestore, create a temporary Vite config that aliases the import `../lib/db.js` to an in-memory mock exporting the same functions (`isConfigured`, `watchTrip`, `watchList`, `createTrip`, `updateTrip`, `saveExpense`, `deleteExpense`, `saveDay`, `deleteDay`, `seedTrip`), run `npx vite --config <that file>`, and delete both files afterwards.
