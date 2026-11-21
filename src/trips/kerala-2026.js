// Kerala Road Trip — Dec 2026. A built-in trip template.
// The first time anyone opens it, this is copied into the database; after that,
// everything (itinerary, members, budget) is edited in the app, not here.
// `id` is the trip's link (#/kerala-2026) and database key — don't change it.

const hotel = ([id, desc, date, place]) => ({ id, desc, date, place, category: "Hotel" });

export default {
  id: "kerala-2026",
  emoji: "🌴",
  title: "Kerala Road Trip",
  subtitle: "Bengaluru ⇄ Kerala · 6 friends",
  startDate: "2026-12-25",
  endDate: "2027-01-03",
  budget: 0,
  estimates: {},

  members: [
    { id: "m1", name: "Himanshu" }, { id: "m2", name: "Ankit" },
    { id: "m3", name: "Ravi" }, { id: "m4", name: "Vash" },
    { id: "m5", name: "Sanjeev" }, { id: "m6", name: "Shreeya" },
  ],

  categories: [
    { name: "Hotel", icon: "🏨" }, { name: "Fuel", icon: "⛽" }, { name: "Toll", icon: "🛣️" },
    { name: "Food", icon: "🍛" }, { name: "Activity", icon: "🎟️" }, { name: "Houseboat", icon: "🛶" },
    { name: "Shopping", icon: "🛍️" }, { name: "Parking", icon: "🅿️" }, { name: "Other", icon: "📌" },
  ],

  places: [
    "Bengaluru", "Kochi", "Munnar", "Thekkady", "Varkala",
    "Kollam", "Thiruvananthapuram", "Alappuzha", "On the way",
  ],
  defaultPlace: "Kochi",

  planNote: "💰 Tolls ≈ ₹1,090 going + ₹965 return. Drive times are from Google Maps and don't include stops.",

  // Expense rows created along with the trip (amount filled in later)
  seedExpenses: [
    ["hotel-kochi-1", "Hotel – Kochi (1 night)", "2026-12-25", "Kochi"],
    ["hotel-munnar", "Hotel – Munnar (2 nights)", "2026-12-26", "Munnar"],
    ["hotel-thekkady", "Hotel – Thekkady (1 night)", "2026-12-28", "Thekkady"],
    ["hotel-varkala", "Hotel – Varkala (2 nights)", "2026-12-29", "Varkala"],
    ["hotel-kochi-2", "Hotel – Kochi (3 nights)", "2026-12-31", "Kochi"],
  ].map(hotel),

  days: [
    { date: "2026-12-25", title: "Bengaluru → Kochi", route: "~10.5 hrs drive · leave early morning", stay: "Kochi · 1 night",
      groups: [{ h: "Evening", items: ["Marine Drive"] }] },
    { date: "2026-12-26", title: "Kochi → Munnar", route: "~4 hrs drive", stay: "Munnar · 2 nights",
      groups: [{ h: "On the way", items: ["Kochi–Munnar route views", "Athirapally Falls (Bahubali shooting spot)", "Cheeyappara Waterfalls", "Valara Waterfalls"] }] },
    { date: "2026-12-27", title: "Munnar sightseeing", route: "Full day in Munnar", stay: "Munnar",
      groups: [
        { h: "Morning", items: ["Kolukkumalai (sunrise point) 🌄", "Eravikulam National Park (Rajamalai)", "Lockhart Tea Museum"] },
        { h: "Through the day", items: ["Spice plantations", "Rose Gardens (Karadippara)", "Elephant bathing", "Attukad Waterfalls", "Mattupetty Lake", "Kundale Lake", "Echo Point", "Shooting Point (Chennai Express)", "Periya Canal Waterfalls", "Ripple Waterfalls", "Old Hanging Bridge", "Ponmudi Dam", "Chinnakanal Waterfalls (best Jul–Aug)"] },
        { h: "Evening", items: ["Pothamedu View Point (sunset) 🌅"] },
      ],
      note: "Too many spots for one day — pick your favourites." },
    { date: "2026-12-28", title: "Munnar → Thekkady", route: "~3 hrs drive", stay: "Thekkady · 1 night",
      groups: [
        { h: "On the way", items: ["Gap Road View Point (Lockhart Gap)", "Devikulam", "Chinnakanal", "Elephant Abode Boating Centre"] },
        { h: "In Thekkady", items: ["Elephant Junction", "Elephant ride & elephant bath", "Ayurveda massage (Rangerwood Nature Castle)", "Tribal dance ⚠️ book in advance", "Musical fountain", "Tropical Chocolate Factory"] },
      ] },
    { date: "2026-12-29", title: "Thekkady → Varkala", route: "~5 hrs drive", stay: "Varkala · 2 nights",
      groups: [{ h: "On the way", items: ["Jatayu Nature Park (Chadayamangalam)"] }] },
    { date: "2026-12-30", title: "Varkala & Kollam", route: "Beach day", stay: "Varkala",
      groups: [{ h: "Plan", items: ["Bond Ocean Safari (Kollam) 🌊", "Varkala Beach & Cliff"] }] },
    { date: "2026-12-31", title: "Varkala → Thiruvananthapuram → Kochi", route: "~1.5 hrs + ~4.5 hrs drive",
      nostay: "Thiruvananthapuram · no stay", stay: "Kochi · 3 nights", badge: "🎉 New Year's Eve in Kochi",
      groups: [{ h: "Thiruvananthapuram", items: ["Sree Padmanabhaswamy Temple", "Kuthiramalika Palace Museum", "Napier Museum", "Sree Chithra Art Gallery", "Zoological Park", "Science & Technology Museum", "Kanakakunnu Palace", "Planetarium"] }],
      note: "Long day — ~6 hrs on the road." },
    { date: "2027-01-01", title: "Kochi", route: "New Year's Day in Kochi", stay: "Kochi",
      groups: [{ h: "Plan", items: ["St. Francis Church & Chinese Fishing Nets", "Fort Kochi", "Jew Town"] }] },
    { date: "2027-01-02", title: "Kochi", route: "Relaxed day", stay: "Kochi",
      groups: [{ h: "Plan", items: ["Santa Cruz Cathedral Basilica", "Marine Drive", "Shopping / free time 🛍️"] }] },
    { date: "2027-01-03", title: "Kochi → Alappuzha → Bengaluru", route: "~1.5 hrs + ~11 hrs drive",
      nostay: "Alappuzha · no hotel",
      groups: [{ h: "Alappuzha", items: ["Houseboat backwater ride 🛶", "International Coir Museum"] }] },
  ],
};
