import { useEffect, useState } from "react";
import { notify } from "./notifications";

export type ComplaintUpdate = {
  at: number;
  status: Complaint["status"];
  note: string;
};

export type Complaint = {
  id: string;
  category: "Wrong billing" | "Sensor faulty" | "Illegal occupant" | "Staff behaviour" | "App issue" | "Other";
  zoneId?: string;
  bookingId?: string;
  message: string;
  rating?: number;
  createdAt: number;
  status: "open" | "in_review" | "resolved";
  photos?: string[];
  updates?: ComplaintUpdate[];
  assignedTo?: string;
  etaAt?: number;
};

const KEY = "gmc.smartpark.complaints.v1";

function read(): Complaint[] {
  if (typeof window === "undefined") return [];
  try { return JSON.parse(localStorage.getItem(KEY) || "[]"); } catch { return []; }
}
function write(items: Complaint[]) {
  localStorage.setItem(KEY, JSON.stringify(items));
  window.dispatchEvent(new Event("gmc:complaints"));
}

export function useComplaints() {
  const [items, setItems] = useState<Complaint[]>([]);
  useEffect(() => {
    setItems(read());
    const h = () => setItems(read());
    window.addEventListener("gmc:complaints", h);
    window.addEventListener("storage", h);
    return () => {
      window.removeEventListener("gmc:complaints", h);
      window.removeEventListener("storage", h);
    };
  }, []);
  return items;
}

export function useComplaint(id: string | undefined): Complaint | undefined {
  const items = useComplaints();
  return id ? items.find((c) => c.id === id) : undefined;
}

const OPS_TEAM = ["Anita (Ops)", "Rakesh (Field)", "Priya (Billing)", "Manish (Sensors)"];
function pickAgent() { return OPS_TEAM[Math.floor(Math.random() * OPS_TEAM.length)]; }

export function createComplaint(input: Omit<Complaint, "id" | "createdAt" | "status">): Complaint {
  const c: Complaint = {
    ...input,
    id: "TKT" + Math.random().toString(36).slice(2, 8).toUpperCase(),
    createdAt: Date.now(),
    status: "open",
    assignedTo: pickAgent(),
    etaAt: Date.now() + 24 * 60 * 60 * 1000,
    updates: [
      {
        at: Date.now(),
        status: "open",
        note: "Ticket received at GMC SmartPark control room. Routed to the nearest field team.",
      },
    ],
  };
  write([c, ...read()]);
  notify({
    title: `Ticket #${c.id} received`,
    body: `${c.category} · GMC ops will update you on progress.`,
    topic: "complaint",
    refId: c.id,
  });
  // Simulated lifecycle updates so the user can see status notifications.
  setTimeout(() => updateComplaintStatus(c.id, "in_review"), 8000);
  setTimeout(() => updateComplaintStatus(c.id, "resolved"), 22000);
  return c;
}

export function updateComplaintStatus(id: string, status: Complaint["status"]) {
  const items = read();
  const before = items.find((c) => c.id === id);
  if (!before || before.status === status) return;
  const note =
    status === "in_review"
      ? `${before.assignedTo ?? "Ops team"} is investigating on site.`
      : status === "resolved"
        ? "Issue verified and closed. Reply on this ticket if it recurs."
        : "Ticket reopened — we'll take another look.";
  const update: ComplaintUpdate = { at: Date.now(), status, note };
  write(
    items.map((c) =>
      c.id === id ? { ...c, status, updates: [...(c.updates ?? []), update] } : c,
    ),
  );
  const label = status === "in_review" ? "now under review" : status === "resolved" ? "resolved" : "reopened";
  notify({
    title: `Ticket #${id} ${label}`,
    body: before.category + " · tap to view the latest update.",
    topic: "complaint",
    refId: id,
  });
}
