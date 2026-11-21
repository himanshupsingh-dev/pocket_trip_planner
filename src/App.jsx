import { useEffect, useState } from "react";
import Home from "./pages/Home.jsx";
import TripPage from "./pages/TripPage.jsx";

const VIEWS = new Set(["plan", "checklist", "expenses", "budget", "settle"]);

// Routes: #/                     → home (your trips + New trip)
//         #/<tripId>/<view>      → one trip (view = plan | expenses | budget | settle)
function readRoute() {
  const [tripId, view] = location.hash.replace(/^#\/?/, "").split("/");
  if (!/^[a-z0-9-]{1,80}$/.test(tripId || "")) return { tripId: null, view: null };
  return { tripId, view: VIEWS.has(view) ? view : "plan" };
}

export default function App() {
  const [route, setRoute] = useState(readRoute);

  useEffect(() => {
    const on = () => { setRoute(readRoute()); window.scrollTo(0, 0); };
    window.addEventListener("hashchange", on);
    return () => window.removeEventListener("hashchange", on);
  }, []);

  return route.tripId
    ? <TripPage key={route.tripId} tripId={route.tripId} view={route.view} />
    : <Home />;
}
