import { useEffect, useState, useCallback } from "react";
import { notify } from "./notifications";

export type Zone = {
  id: string;
  name: string;
  area: string;
  distanceKm: number;
  totalBays: number;
  availableBays: number;
  ratePerHour: number;
  type: "Market" | "Office" | "Hospital" | "Tourist" | "Transit" | "Smart City";
  ev: boolean;
  covered: boolean;
  lat: number;
  lng: number;
  /** Physical layout — drives how the lot is rendered. */
  layout: "open" | "single-lane" | "multi-floor";
  /** Number of floors for multi-floor lots. Defaults to 1. */
  floors?: number;
};

export const ZONES: Zone[] = [
  { id: "fancy-bazaar", name: "Fancy Bazaar Multi-Level", area: "Fancy Bazaar", distanceKm: 0.4, totalBays: 220, availableBays: 38, ratePerHour: 30, type: "Market", ev: true, covered: true, lat: 26.183, lng: 91.745, layout: "multi-floor", floors: 3 },
  { id: "gs-road-a", name: "GS Road · Christian Basti", area: "GS Road", distanceKm: 1.2, totalBays: 140, availableBays: 12, ratePerHour: 40, type: "Office", ev: true, covered: false, lat: 26.144, lng: 91.776, layout: "single-lane" },
  { id: "pan-bazaar-b", name: "Pan Bazaar · Zone B", area: "Pan Bazaar", distanceKm: 0.8, totalBays: 90, availableBays: 24, ratePerHour: 25, type: "Market", ev: false, covered: false, lat: 26.187, lng: 91.749, layout: "open" },
  { id: "dispur-secretariat", name: "Dispur Secretariat", area: "Dispur", distanceKm: 5.6, totalBays: 320, availableBays: 110, ratePerHour: 20, type: "Office", ev: true, covered: true, lat: 26.135, lng: 91.799, layout: "multi-floor", floors: 2 },
  { id: "gmch", name: "GMC Hospital Visitor Lot", area: "Bhangagarh", distanceKm: 3.1, totalBays: 180, availableBays: 6, ratePerHour: 20, type: "Hospital", ev: false, covered: true, lat: 26.157, lng: 91.768, layout: "multi-floor", floors: 2 },
  { id: "kamakhya", name: "Kamakhya Temple Lower", area: "Kamakhya", distanceKm: 7.2, totalBays: 260, availableBays: 84, ratePerHour: 30, type: "Tourist", ev: false, covered: false, lat: 26.166, lng: 91.706, layout: "open" },
  { id: "ghy-railway", name: "Guwahati Railway Station", area: "Paltan Bazaar", distanceKm: 1.5, totalBays: 200, availableBays: 0, ratePerHour: 35, type: "Transit", ev: true, covered: true, lat: 26.184, lng: 91.751, layout: "single-lane" },
  { id: "six-mile", name: "Six Mile Smart Lot", area: "Six Mile", distanceKm: 6.8, totalBays: 120, availableBays: 47, ratePerHour: 25, type: "Smart City", ev: true, covered: false, lat: 26.131, lng: 91.802, layout: "open" },
];

export function getZone(id: string) {
  return ZONES.find((z) => z.id === id);
}

export type Booking = {
  id: string;
  zoneId: string;
  bay: string;
  vehicleNumber: string;
  startsAt: number;
  hours: number;
  amount: number;
  status: "reserved" | "active" | "completed" | "cancelled";
  paymentMethod?: "UPI" | "FASTag" | "Wallet" | "Card";
  paidAt?: number;
};

const KEY = "gmc.smartpark.bookings.v1";
const VEHICLE_KEY = "gmc.smartpark.vehicle.v1";

function read(): Booking[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(KEY) || "[]") as Booking[];
  } catch {
    return [];
  }
}

function write(b: Booking[]) {
  localStorage.setItem(KEY, JSON.stringify(b));
  window.dispatchEvent(new Event("gmc:bookings"));
}

export function useBookings() {
  const [items, setItems] = useState<Booking[]>([]);
  useEffect(() => {
    setItems(read());
    const h = () => setItems(read());
    window.addEventListener("gmc:bookings", h);
    window.addEventListener("storage", h);
    return () => {
      window.removeEventListener("gmc:bookings", h);
      window.removeEventListener("storage", h);
    };
  }, []);
  return items;
}

export function createBooking(input: Omit<Booking, "id" | "status">): Booking {
  const b: Booking = { ...input, id: "BK" + Math.random().toString(36).slice(2, 8).toUpperCase(), status: "reserved" };
  write([b, ...read()]);
  const z = ZONES.find((x) => x.id === b.zoneId);
  notify({
    title: "Bay reserved",
    body: `${z?.name ?? b.zoneId} · Bay ${b.bay} held for ${b.hours}h. Pay to confirm.`,
    topic: "booking",
    refId: b.id,
  });
  return b;
}

export function updateBooking(id: string, patch: Partial<Booking>) {
  const before = read().find((b) => b.id === id);
  const next = read().map((b) => (b.id === id ? { ...b, ...patch } : b));
  write(next);
  const after = next.find((b) => b.id === id);
  if (before && after && patch.status && patch.status !== before.status) {
    const z = ZONES.find((x) => x.id === after.zoneId);
    const msg: Record<Booking["status"], string> = {
      reserved: "Reservation reopened.",
      active: `Session active at ${z?.name ?? after.zoneId}, Bay ${after.bay}.`,
      completed: `Session ended · ${formatINR(after.amount)} charged.`,
      cancelled: "Booking cancelled. Any hold has been released.",
    };
    notify({
      title: `Booking ${after.id} · ${after.status}`,
      body: msg[after.status],
      topic: "booking",
      refId: after.id,
    });
  }
}

export function getBooking(id: string) {
  return read().find((b) => b.id === id);
}

export function useVehicle() {
  const [v, setV] = useState<string>("");
  useEffect(() => {
    setV(localStorage.getItem(VEHICLE_KEY) || "AS-01-BK-4921");
  }, []);
  const save = useCallback((next: string) => {
    localStorage.setItem(VEHICLE_KEY, next);
    setV(next);
  }, []);
  return [v, save] as const;
}

export function formatINR(n: number) {
  return "₹" + n.toLocaleString("en-IN");
}
