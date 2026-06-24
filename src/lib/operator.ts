import { useEffect, useState } from "react";
import { ZONES, type Zone, type Booking } from "./parking";
import { getBooking, updateBooking } from "./parking";

export type Operator = {
  id: string;
  name: string;
  phone: string;
  zoneId: string;
  shiftStart: string;
};

// Demo operator directory — local auth, no backend.
const DIRECTORY: Record<string, { password: string; operator: Operator }> = {
  OP001: {
    password: "1234",
    operator: { id: "OP001", name: "Rakesh Kalita", phone: "+91 98640 11122", zoneId: "fancy-bazaar", shiftStart: "08:00" },
  },
  OP002: {
    password: "1234",
    operator: { id: "OP002", name: "Priya Deka", phone: "+91 98640 22233", zoneId: "gs-road-a", shiftStart: "09:00" },
  },
  OP003: {
    password: "1234",
    operator: { id: "OP003", name: "Tridib Sarma", phone: "+91 98640 33344", zoneId: "dispur-secretariat", shiftStart: "07:00" },
  },
  OP004: {
    password: "1234",
    operator: { id: "OP004", name: "Anjali Boro", phone: "+91 98640 44455", zoneId: "gmch", shiftStart: "10:00" },
  },
};

const SESSION_KEY = "gmc.smartpark.operator.session.v1";
const ALLOT_KEY = "gmc.smartpark.operator.allotments.v1";
const SHIFT_KEY = "gmc.smartpark.operator.shifts.v1";

export function listDemoOperators() {
  return Object.entries(DIRECTORY).map(([id, v]) => ({ id, name: v.operator.name, zoneId: v.operator.zoneId }));
}

export function operatorLogin(id: string, password: string): Operator | null {
  const rec = DIRECTORY[id.toUpperCase()];
  if (!rec || rec.password !== password) return null;
  localStorage.setItem(SESSION_KEY, JSON.stringify(rec.operator));
  startShift(rec.operator.id);
  window.dispatchEvent(new Event("gmc:operator"));
  return rec.operator;
}

export function operatorLogout() {
  const op = getOperator();
  if (op) endShift(op.id);
  localStorage.removeItem(SESSION_KEY);
  window.dispatchEvent(new Event("gmc:operator"));
}

export function getOperator(): Operator | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    return raw ? (JSON.parse(raw) as Operator) : null;
  } catch {
    return null;
  }
}

export function useOperator() {
  const [op, setOp] = useState<Operator | null>(null);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    setOp(getOperator());
    setReady(true);
    const h = () => setOp(getOperator());
    window.addEventListener("gmc:operator", h);
    window.addEventListener("storage", h);
    return () => {
      window.removeEventListener("gmc:operator", h);
      window.removeEventListener("storage", h);
    };
  }, []);
  return { operator: op, ready };
}

export type Allotment = {
  id: string;
  zoneId: string;
  bay: string;
  vehicleNumber: string;
  operatorId: string;
  source: "manual" | "qr";
  checkInAt: number;
  checkOutAt?: number;
  ratePerHour: number;
  amount?: number;
  bookingId?: string;
  prepaidAmount?: number;
  prepaidHours?: number;
};

function readAllot(): Allotment[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(ALLOT_KEY) || "[]") as Allotment[];
  } catch {
    return [];
  }
}

function writeAllot(a: Allotment[]) {
  localStorage.setItem(ALLOT_KEY, JSON.stringify(a));
  window.dispatchEvent(new Event("gmc:allotments"));
}

export function useAllotments() {
  const [items, setItems] = useState<Allotment[]>([]);
  useEffect(() => {
    setItems(readAllot());
    const h = () => setItems(readAllot());
    window.addEventListener("gmc:allotments", h);
    window.addEventListener("storage", h);
    return () => {
      window.removeEventListener("gmc:allotments", h);
      window.removeEventListener("storage", h);
    };
  }, []);
  return items;
}

export function createAllotment(input: Omit<Allotment, "id" | "checkInAt">): Allotment {
  const a: Allotment = {
    ...input,
    id: "AL" + Math.random().toString(36).slice(2, 8).toUpperCase(),
    checkInAt: Date.now(),
  };
  writeAllot([a, ...readAllot()]);
  return a;
}

export function checkOutAllotment(id: string): Allotment | null {
  const items = readAllot();
  const idx = items.findIndex((x) => x.id === id && !x.checkOutAt);
  if (idx < 0) return null;
  const a = items[idx];
  const now = Date.now();
  const hours = Math.max(1, Math.ceil((now - a.checkInAt) / (1000 * 60 * 60)));
  const gross = hours * a.ratePerHour;
  const net = Math.max(0, gross - (a.prepaidAmount ?? 0));
  const updated: Allotment = { ...a, checkOutAt: now, amount: net };
  items[idx] = updated;
  writeAllot(items);
  // If this allotment was linked to a user booking, mark that booking
  // completed so the bay is released back to "free" in the grid.
  if (a.bookingId) {
    try {
      updateBooking(a.bookingId, { status: "completed" });
    } catch {
      /* booking may not exist in demo store; ignore */
    }
  }
  return updated;
}

// Calculate billing for an active allotment without committing — used by the
// checkout / pay-now screen to show a live amount and drive the QR payload.
export function previewCheckout(a: Allotment, atTs: number = Date.now()) {
  const ms = Math.max(0, atTs - a.checkInAt);
  const exactHours = ms / (1000 * 60 * 60);
  const hours = Math.max(1, Math.ceil(exactHours));
  const gross = hours * a.ratePerHour;
  const prepaid = a.prepaidAmount ?? 0;
  const amount = Math.max(0, gross - prepaid);
  return { hours, exactHours, amount, gross, prepaid };
}

// Build a UPI deep-link payload that any UPI app (GPay / PhonePe / Paytm) can
// open when the customer scans the QR on the operator's screen.
export function buildUpiPayload(opts: {
  payeeVpa?: string;
  payeeName?: string;
  amount: number;
  note: string;
  txnRef: string;
}) {
  const vpa = opts.payeeVpa ?? "gmcsmartpark@upi";
  const name = opts.payeeName ?? "GMC SmartPark";
  const params = new URLSearchParams({
    pa: vpa,
    pn: name,
    am: opts.amount.toFixed(2),
    cu: "INR",
    tn: opts.note,
    tr: opts.txnRef,
  });
  return `upi://pay?${params.toString()}`;
}

export function findActiveByVehicle(vehicle: string, zoneId?: string): Allotment | undefined {
  const v = vehicle.trim().toUpperCase();
  return readAllot().find(
    (a) => !a.checkOutAt && a.vehicleNumber.toUpperCase() === v && (!zoneId || a.zoneId === zoneId),
  );
}

// Parse QR payload. Supported formats:
//  - "SMARTPARK:V=AS01BK4921;B=A-12"        (vehicle + suggested bay)
//  - "SMARTPARK:V=AS01BK4921"
//  - raw vehicle number e.g. "AS-01-BK-4921"
export type QrPayload = {
  vehicle: string;
  bay?: string;
  bookingId?: string;
  zoneId?: string;
  prepaidAmount?: number;
  prepaidHours?: number;
};
export function parseQr(text: string): QrPayload | null {
  if (!text) return null;
  const t = text.trim();
  if (t.toUpperCase().startsWith("SMARTPARK:")) {
    const body = t.slice("SMARTPARK:".length);
    const parts = body.split(";").map((s) => s.trim()).filter(Boolean);
    const map: Record<string, string> = {};
    for (const p of parts) {
      const [k, v] = p.split("=");
      if (k && v) map[k.toUpperCase()] = v.trim();
    }
    if (!map.V) return null;
    return {
      vehicle: formatPlate(map.V),
      bay: map.B,
      bookingId: map.BK,
      zoneId: map.Z,
      prepaidAmount: map.A ? Number(map.A) : undefined,
      prepaidHours: map.H ? Number(map.H) : undefined,
    };
  }
  // plain vehicle number
  const looksLikePlate = /^[A-Z]{2}[- ]?\d{1,2}[- ]?[A-Z]{1,3}[- ]?\d{1,4}$/i.test(t);
  if (looksLikePlate) return { vehicle: formatPlate(t) };
  return null;
}

// Cross-reference a QR with the user's booking store. Returns enriched data
// when the QR matches a paid booking, so the operator can confirm a pre-paid
// check-in instead of asking the user to pay again.
export function resolveBookingFromQr(p: QrPayload) {
  if (!p.bookingId) return null;
  const b = getBooking(p.bookingId);
  if (!b) return null;
  return b;
}

function formatPlate(s: string) {
  const compact = s.replace(/[^A-Za-z0-9]/g, "").toUpperCase();
  // AS01BK4921 -> AS-01-BK-4921
  const m = compact.match(/^([A-Z]{2})(\d{1,2})([A-Z]{1,3})(\d{1,4})$/);
  return m ? `${m[1]}-${m[2]}-${m[3]}-${m[4]}` : compact;
}

// Bay grid: derive labels and live status from allotments + user bookings.
// status: "free"     — available to allot
//         "reserved" — pre-booked by a user, awaiting their arrival/QR scan
//         "active"   — checked in (allotment in progress)
export type BayStatus = "free" | "reserved" | "active";
export type BayCell = {
  label: string;
  status: BayStatus;
  allotmentId?: string;
  bookingId?: string;
  /** Floor label (e.g. "F1") for multi-floor lots. */
  floor?: string;
  /** convenience: status !== "free" */
  occupied: boolean;
};
export function buildBayGrid(
  zone: Zone,
  allotments: Allotment[],
  bookings: Booking[] = [],
): BayCell[] {
  const cells: BayCell[] = [];
  if (zone.layout === "single-lane") {
    const total = Math.min(zone.totalBays, 16);
    for (let i = 0; i < total; i++) {
      const num = String(i + 1).padStart(2, "0");
      cells.push({ label: `L-${num}`, status: "free", occupied: false });
    }
  } else if (zone.layout === "multi-floor") {
    const floors = Math.max(1, zone.floors ?? 2);
    const perFloor = Math.min(16, Math.ceil(Math.min(zone.totalBays, 48) / floors));
    for (let f = 1; f <= floors; f++) {
      for (let i = 0; i < perFloor; i++) {
        const num = String(i + 1).padStart(2, "0");
        cells.push({
          label: `F${f}-${num}`,
          status: "free",
          occupied: false,
          floor: `F${f}`,
        });
      }
    }
  } else {
    const total = Math.min(zone.totalBays, 48);
    for (let i = 0; i < total; i++) {
      const row = String.fromCharCode(65 + Math.floor(i / 12));
      const num = String((i % 12) + 1).padStart(2, "0");
      cells.push({ label: `${row}-${num}`, status: "free", occupied: false });
    }
  }
  // Reserved bays from paid user bookings not yet checked in
  const checkedInBookingIds = new Set(
    allotments.filter((a) => !a.checkOutAt && a.bookingId).map((a) => a.bookingId!),
  );
  for (const b of bookings) {
    if (b.zoneId !== zone.id) continue;
    if (b.status !== "active" && b.status !== "reserved") continue;
    if (checkedInBookingIds.has(b.id)) continue;
    const idx = cells.findIndex((c) => c.label === b.bay);
    if (idx >= 0)
      cells[idx] = { ...cells[idx], status: "reserved", bookingId: b.id, occupied: true };
  }
  // Active allotments override anything else
  for (const a of allotments) {
    if (a.zoneId !== zone.id || a.checkOutAt) continue;
    const idx = cells.findIndex((c) => c.label === a.bay);
    if (idx >= 0)
      cells[idx] = { ...cells[idx], status: "active", allotmentId: a.id, occupied: true };
  }
  return cells;
}

export function operatorZone(op: Operator): Zone | undefined {
  return ZONES.find((z) => z.id === op.zoneId);
}

export function useToday() {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(t);
  }, []);
  return now;
}

export function startOfDay(ts: number) {
  const d = new Date(ts);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

// ============= Shifts =============
// Tracks operator clock-in / clock-out so the profile can show a history
// and the current shift duration.
export type Shift = {
  id: string;
  operatorId: string;
  startAt: number;
  endAt?: number;
};

function readShifts(): Shift[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(SHIFT_KEY) || "[]") as Shift[];
  } catch {
    return [];
  }
}

function writeShifts(s: Shift[]) {
  localStorage.setItem(SHIFT_KEY, JSON.stringify(s));
  window.dispatchEvent(new Event("gmc:shifts"));
}

export function startShift(operatorId: string): Shift {
  const items = readShifts();
  // If an open shift already exists for this operator, reuse it.
  const open = items.find((s) => s.operatorId === operatorId && !s.endAt);
  if (open) return open;
  const shift: Shift = {
    id: "SH" + Math.random().toString(36).slice(2, 8).toUpperCase(),
    operatorId,
    startAt: Date.now(),
  };
  writeShifts([shift, ...items]);
  return shift;
}

export function endShift(operatorId: string): Shift | null {
  const items = readShifts();
  const idx = items.findIndex((s) => s.operatorId === operatorId && !s.endAt);
  if (idx < 0) return null;
  const updated: Shift = { ...items[idx], endAt: Date.now() };
  items[idx] = updated;
  writeShifts(items);
  return updated;
}

export function getCurrentShift(operatorId: string): Shift | undefined {
  return readShifts().find((s) => s.operatorId === operatorId && !s.endAt);
}

export function useShifts(operatorId?: string) {
  const [items, setItems] = useState<Shift[]>([]);
  useEffect(() => {
    const load = () => {
      const all = readShifts();
      setItems(operatorId ? all.filter((s) => s.operatorId === operatorId) : all);
    };
    load();
    window.addEventListener("gmc:shifts", load);
    window.addEventListener("storage", load);
    const t = setInterval(load, 60_000);
    return () => {
      window.removeEventListener("gmc:shifts", load);
      window.removeEventListener("storage", load);
      clearInterval(t);
    };
  }, [operatorId]);
  return items;
}

export function formatShiftDuration(startAt: number, endAt?: number) {
  const ms = (endAt ?? Date.now()) - startAt;
  const mins = Math.max(0, Math.floor(ms / 60_000));
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${h}h ${String(m).padStart(2, "0")}m`;
}
