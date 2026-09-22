// Bundled demo data. Salvaged from the v1 prototype and trimmed for the
// clean v2 app. Used as the offline fallback when the backend is unreachable.

export const ZONES = [
  { id: "cbd", name: "CBD / Main Mall", color: "#3B82F6", lat: -24.632, lng: 25.9085 },
  { id: "gamecity", name: "Game City", color: "#12A4F3", lat: -24.655, lng: 25.87 },
  { id: "ext9", name: "Extension 9", color: "#10B981", lat: -24.61, lng: 25.93 },
  { id: "broadhurst", name: "Broadhurst", color: "#0C7CF4", lat: -24.6555, lng: 25.945 },
  { id: "phakalane", name: "Phakalane", color: "#EC4899", lat: -24.58, lng: 25.95 },
  { id: "airport", name: "Airport Junction", color: "#F59E0B", lat: -24.595, lng: 25.935 },
  { id: "riverwalk", name: "Riverwalk", color: "#8B5CF6", lat: -24.66, lng: 25.93 },
  { id: "mogoditshane", name: "Mogoditshane", color: "#14B8A6", lat: -24.63, lng: 25.85 },
];

export const CATEGORIES = [
  { id: "errands", label: "Errands", icon: "🏃" },
  { id: "food", label: "Food", icon: "🍔" },
  { id: "groceries", label: "Groceries", icon: "🛒" },
  { id: "documents", label: "Documents", icon: "📄" },
  { id: "parcels", label: "Parcels", icon: "📦" },
  { id: "shopping", label: "Shopping", icon: "🛍️" },
];

export const RUNNERS = [
  { id: "r1", name: "Portia S.", emoji: "🏃‍♀️", rating: 4.98, runs: 94, zone: "cbd", streak: 18, verified: true },
  { id: "r2", name: "Nthabi R.", emoji: "🏃‍♀️", rating: 4.99, runs: 29, zone: "phakalane", streak: 16, verified: true },
  { id: "r3", name: "Mpho T.", emoji: "🏃‍♀️", rating: 4.97, runs: 112, zone: "gamecity", streak: 24, verified: true },
  { id: "r4", name: "Lethiwe K.", emoji: "🏃‍♀️", rating: 4.96, runs: 67, zone: "broadhurst", streak: 20, verified: true },
  { id: "r5", name: "Lebo K.", emoji: "🏃", rating: 4.95, runs: 87, zone: "cbd", streak: 12, verified: true },
  { id: "r6", name: "Otsile M.", emoji: "🏃", rating: 4.94, runs: 25, zone: "phakalane", streak: 11, verified: true },
  { id: "r7", name: "Kago S.", emoji: "🏃", rating: 4.93, runs: 98, zone: "gamecity", streak: 15, verified: true },
  { id: "r8", name: "Tshepo M.", emoji: "🏃", rating: 4.91, runs: 81, zone: "cbd", streak: 9, verified: true },
];

export const SERVICES = [
  {
    id: "s1", runnerId: "r1", category: "documents",
    title: "Express document courier", price: 75, eta: "30 to 45 min",
    desc: "Contracts, passports, certificates and office paperwork. Sealed envelope, photo proof on handover, direct point to point.",
  },
  {
    id: "s2", runnerId: "r3", category: "groceries",
    title: "Weekly grocery run", price: 130, eta: "45 to 75 min",
    desc: "Send your shopping list. I shop at Pick n Pay or Spar, pack it right and deliver to your door. Receipt always included.",
  },
  {
    id: "s3", runnerId: "r4", category: "errands",
    title: "Pharmacy pickup", price: 65, eta: "30 to 50 min",
    desc: "Prescriptions and chronic medication collected from any pharmacy. Discreet bag, correct change, delivery PIN on arrival.",
  },
  {
    id: "s4", runnerId: "r5", category: "parcels",
    title: "Same day parcel dash", price: 70, eta: "30 to 60 min",
    desc: "Parcels up to 10kg anywhere in Gaborone. Live tracking from pickup to drop off. Fragile items handled with care.",
  },
  {
    id: "s5", runnerId: "r2", category: "shopping",
    title: "Personal shopper", price: 110, eta: "60 to 90 min",
    desc: "Clothes, gifts, electronics or anything on your list. I send photos before you pay and queue so you do not have to.",
  },
  {
    id: "s6", runnerId: "r7", category: "food",
    title: "Hot food pickup", price: 55, eta: "25 to 40 min",
    desc: "Your favourite restaurant order, picked up hot and delivered fast. Insulated bag keeps it fresh on the way.",
  },
  {
    id: "s7", runnerId: "r8", category: "errands",
    title: "Queue for me", price: 60, eta: "45 to 90 min",
    desc: "Banks, government offices, bill payments. I stand in line, handle the paperwork and report back with proof.",
  },
  {
    id: "s8", runnerId: "r6", category: "parcels",
    title: "Airport meet and greet", price: 120, eta: "60 min",
    desc: "Pick up arriving guests or parcels at Sir Seretse Khama Airport and deliver them safely into town.",
  },
];

export const REVIEWS = [
  { name: "Dineo", text: "Fast and polite. Sent photos the whole way.", rating: 5 },
  { name: "Kabo", text: "Package arrived exactly as promised.", rating: 5 },
  { name: "Neo", text: "Good communication, slight delay in traffic.", rating: 4 },
];

export const CITIES = [
  "Gaborone", "Francistown", "Maun", "Kasane", "Lobatse", "Selebi-Phikwe",
  "Serowe", "Molepolole", "Palapye", "Kanye", "Jwaneng", "Orapa",
  "Ghanzi", "Tsabong",
];

export const SEED_NOTIFICATIONS = [
  { id: "n1", title: "Weekend deal", body: "20% off grocery runs in Game City this Saturday.", time: "2h ago", unread: true },
  { id: "n2", title: "New runners near you", body: "3 verified runners joined Extension 9 this week.", time: "1d ago", unread: true },
  { id: "n3", title: "Welcome to SwiftRun", body: "Book your first run and pay with Orange Money or MyZaka.", time: "3d ago", unread: false },
];

export const SEED_BOOKINGS = [
  {
    id: "BK-1042", serviceTitle: "Weekly grocery run", runnerName: "Mpho T.",
    category: "Groceries", pickup: "Pick n Pay, Game City", dropoff: "Block 6, Gaborone",
    note: "2 bags. Call on arrival.", price: 130, status: "delivered",
    createdAt: Date.now() - 3 * 86400000,
  },
];
