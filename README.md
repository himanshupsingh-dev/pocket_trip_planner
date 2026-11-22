# 🧳 Pocket Trip Planner

Plan group trips, track the budget, and split expenses. Each trip has its own itinerary, members, budget and expenses.

**Features**
- **＋ New trip** from the home page: name, dates, budget, members, places.
- **Plan:** day-by-day itinerary, editable in the app (add / edit / delete days and places).
- **Checklist:** shared trip to-do list (tasks with due dates, sorted in ascending order of date; anyone can view, add, or edit tasks).
- **Expenses:** anyone on the trip adds what they paid; split equally among the people ticked.
- **Budget:** total budget, an estimate per category, and an *Estimated vs actual* chart. The Budget, Estimated, Actual and Remaining tiles show on every tab.
- **Settle up:** who pays whom, balances, totals by category and place.
- **🔗 Invite:** each trip has its own private link. Members open it and pick their name; no account needed.

**Stack:** React 18 + Vite · Firebase Firestore (free Spark plan, live sync) · GitHub Pages (free hosting via GitHub Actions).

## How access works
Every trip gets a hard-to-guess link, e.g. `…/#/goa-weekend-k3x9p2q7mw`. Only people who have the link can open the trip:
the database can't be listed or searched, so a trip can only be opened by its exact id.
Anyone *with* the link can view and edit that trip, so share it only with the group.
The home page shows the trips you've created or opened **on that device**.

## Project structure
```
src/
  App.jsx                 router: #/ (home) · #/<tripId>/plan | expenses | budget | settle
  pages/
    Home.jsx              your trips + ＋ New trip
    TripPage.jsx          one trip: header, budget tiles, tabs, live data
  components/
    Plan.jsx, DaySheet.jsx          itinerary + add/edit a day
    Expenses.jsx, ExpenseSheet.jsx  expense list + add/edit an expense
    Budget.jsx, BudgetSheet.jsx     estimated-vs-actual chart + edit budget/estimates
    Settle.jsx                      who pays whom, balances, totals
    TripSheet.jsx                   create / edit a trip (details, members, places)
    ShareSheet.jsx                  invite link
    WhoSheet.jsx                    "Who are you?" picker (remembered per trip, per device)
    Sheet.jsx, TabBar.jsx
  trips/
    index.js              built-in trip templates (none at the moment), default categories, trip helpers
  lib/
    db.js                 Firestore reads/writes
    money.js              split maths, settle-up, budget summary
    dates.js              date formatting
    device.js             things remembered on this device (your trips, who you are)
  firebase-config.js      ← your Firebase keys go here
firestore.rules           database security rules
scripts/move-trip.mjs     move a trip to a new link if its link leaked
.github/workflows/deploy.yml   builds & publishes to GitHub Pages on every push
```

**Database layout:** `trips/{tripId}` (title, dates, members, budget, estimates, places), with
`trips/{tripId}/expenses/{id}`, `trips/{tripId}/days/{id}`, and `trips/{tripId}/checklist/{id}` underneath.

---

## 1. Create the free database (Firebase), ~5 min
1. https://console.firebase.google.com → your project (`pocket-trip-planner`). Stay on the free **Spark** plan; don't click Upgrade.
2. **Databases & Storage → Firestore → Create database** → **Standard** edition → location **asia-south1 (Mumbai)** → **production mode** → Create.
3. **Rules** tab → replace everything with `firestore.rules` → **Publish**. *(Re-publish whenever this file changes.)*
4. **Project Overview → ＋ Add app → `</>` Web** → nickname `pocket-trip-planner-web` (leave Hosting unticked) → **Register app**.
5. Copy the `firebaseConfig` values into `src/firebase-config.js`.

## 2. Run locally (optional)
Needs Node.js 18+.
```bash
npm install
npm run dev
```
Open the printed `http://localhost:5173` link.

## 3. Push to GitHub
Create an **empty public repo** at https://github.com/new named `pocket_trip_planner` (no README). Then in this folder:
```bash
git init
git add .
git commit -m "Pocket Trip Planner"
git branch -M main
git remote add origin https://github.com/<your-username>/pocket_trip_planner.git
git push -u origin main
```

## 4. Turn on free hosting
Repo → **Settings → Pages** → **Source: GitHub Actions**.
Then **Actions** tab → **Deploy to GitHub Pages** → **Re-run all jobs** (only needed the first time).
In ~1 minute the site is live at **`https://<your-username>.github.io/pocket_trip_planner/`**. Every later `git push` redeploys automatically.

## Notes
- **New trips** are created in the app; nothing to code. Use **🔗 Invite** inside the trip to send its link.
- **Adding someone later:** add their name in **⚙️ Edit trip → Members**, then send them the link.
- **Removing a member** is blocked while they're part of an expense with an amount; change those expenses first.
- **A trip link reached the wrong people?** Run `node scripts/move-trip.mjs <trip-id>`. It copies the trip to a new private link and prints that link. Then add the old id to `retired()` in `firestore.rules` and publish the rules, so the old link stops working. Send the new link only to the group.
- **Estimates** are per category (Hotel, Fuel, Food, …), set on the **Budget** tab. *Actual* is the sum of all expenses.
