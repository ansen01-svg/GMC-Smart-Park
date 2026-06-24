import { useEffect, useState } from "react";

export type Channel = "push" | "sms" | "inapp";

export type Notification = {
  id: string;
  title: string;
  body: string;
  topic: "booking" | "complaint" | "system";
  refId?: string;
  createdAt: number;
  read: boolean;
  channels: Channel[];
};

export type NotifPrefs = {
  push: boolean;
  sms: boolean;
  phone: string;
  bookingUpdates: boolean;
  complaintUpdates: boolean;
  pushPermission: NotificationPermission | "unsupported";
};

const KEY = "gmc.smartpark.notifications.v1";
const PREFS_KEY = "gmc.smartpark.notifprefs.v1";

const DEFAULT_PREFS: NotifPrefs = {
  push: false,
  sms: false,
  phone: "",
  bookingUpdates: true,
  complaintUpdates: true,
  pushPermission: "default",
};

function read(): Notification[] {
  if (typeof window === "undefined") return [];
  try { return JSON.parse(localStorage.getItem(KEY) || "[]"); } catch { return []; }
}
function write(items: Notification[]) {
  localStorage.setItem(KEY, JSON.stringify(items.slice(0, 100)));
  window.dispatchEvent(new Event("gmc:notifications"));
}

export function readPrefs(): NotifPrefs {
  if (typeof window === "undefined") return DEFAULT_PREFS;
  try {
    const raw = JSON.parse(localStorage.getItem(PREFS_KEY) || "null");
    const supported = typeof window !== "undefined" && "Notification" in window;
    return {
      ...DEFAULT_PREFS,
      ...(raw || {}),
      pushPermission: supported ? Notification.permission : "unsupported",
    };
  } catch { return DEFAULT_PREFS; }
}
export function writePrefs(p: NotifPrefs) {
  localStorage.setItem(PREFS_KEY, JSON.stringify(p));
  window.dispatchEvent(new Event("gmc:notifprefs"));
}

export function useNotifications() {
  const [items, setItems] = useState<Notification[]>([]);
  useEffect(() => {
    setItems(read());
    const h = () => setItems(read());
    window.addEventListener("gmc:notifications", h);
    window.addEventListener("storage", h);
    return () => {
      window.removeEventListener("gmc:notifications", h);
      window.removeEventListener("storage", h);
    };
  }, []);
  return items;
}

export function useNotifPrefs() {
  const [p, setP] = useState<NotifPrefs>(DEFAULT_PREFS);
  useEffect(() => {
    setP(readPrefs());
    const h = () => setP(readPrefs());
    window.addEventListener("gmc:notifprefs", h);
    window.addEventListener("storage", h);
    return () => {
      window.removeEventListener("gmc:notifprefs", h);
      window.removeEventListener("storage", h);
    };
  }, []);
  return p;
}

export async function requestPushPermission(): Promise<NotificationPermission | "unsupported"> {
  if (typeof window === "undefined" || !("Notification" in window)) return "unsupported";
  const res = await Notification.requestPermission();
  const prefs = readPrefs();
  writePrefs({ ...prefs, push: res === "granted", pushPermission: res });
  return res;
}

export function notify(input: {
  title: string;
  body: string;
  topic: Notification["topic"];
  refId?: string;
}) {
  if (typeof window === "undefined") return;
  const prefs = readPrefs();
  if (input.topic === "booking" && !prefs.bookingUpdates) return;
  if (input.topic === "complaint" && !prefs.complaintUpdates) return;

  const channels: Channel[] = ["inapp"];

  if (prefs.push && "Notification" in window && Notification.permission === "granted") {
    try {
      new Notification(input.title, { body: input.body, tag: input.refId, icon: "/favicon.ico" });
      channels.push("push");
    } catch { /* noop */ }
  }

  if (prefs.sms && prefs.phone) {
    // Simulated SMS delivery — would call a server route in production.
    console.info(`[SMS → ${prefs.phone}] ${input.title}: ${input.body}`);
    channels.push("sms");
  }

  const n: Notification = {
    id: "N" + Math.random().toString(36).slice(2, 8).toUpperCase(),
    title: input.title,
    body: input.body,
    topic: input.topic,
    refId: input.refId,
    createdAt: Date.now(),
    read: false,
    channels,
  };
  write([n, ...read()]);
}

export function markAllRead() {
  write(read().map((n) => ({ ...n, read: true })));
}
export function clearAll() {
  write([]);
}
export function unreadCount(items: Notification[]) {
  return items.filter((n) => !n.read).length;
}