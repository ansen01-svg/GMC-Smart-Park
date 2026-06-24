import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import BottomNav from "@/components/BottomNav";
import {
  useNotifications,
  useNotifPrefs,
  writePrefs,
  requestPushPermission,
  markAllRead,
  clearAll,
  notify,
} from "@/lib/notifications";

export const Route = createFileRoute("/notifications")({
  head: () => ({ meta: [{ title: "Notifications — GMC SmartPark" }] }),
  component: NotificationsPage,
});

function NotificationsPage() {
  const items = useNotifications();
  const prefs = useNotifPrefs();
  const nav = useNavigate();
  const pushBlocked = prefs.pushPermission === "denied";
  const pushUnsupported = prefs.pushPermission === "unsupported";

  async function togglePush(next: boolean) {
    if (next) {
      const res = await requestPushPermission();
      if (res === "granted") {
        notify({
          title: "Push notifications enabled",
          body: "You'll get instant alerts for bookings and complaints.",
          topic: "system",
        });
      }
    } else {
      writePrefs({ ...prefs, push: false });
    }
  }

  function setPhone(v: string) {
    writePrefs({ ...prefs, phone: v });
  }

  function toggleSMS(next: boolean) {
    if (next && !prefs.phone) {
      writePrefs({ ...prefs, sms: true });
      return;
    }
    writePrefs({ ...prefs, sms: next });
    if (next) {
      notify({
        title: "SMS alerts on",
        body: `Updates will be sent to ${prefs.phone || "your number"}.`,
        topic: "system",
      });
    }
  }

  return (
    <div className="min-h-screen bg-background pb-24 font-sans text-foreground">
      <header className="sticky top-0 z-30 border-b border-foreground/5 bg-background/90 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-5 py-4">
          <div className="flex items-center gap-3">
            <button onClick={() => nav({ to: "/profile" })} className="-ml-2 flex size-9 items-center justify-center">
              <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
            </button>
            <h1 className="text-lg font-bold tracking-tight">Notifications</h1>
          </div>
          <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-foreground/50">
            <button onClick={markAllRead} className="rounded-full border border-foreground/10 px-2 py-1">Mark read</button>
            <button onClick={clearAll} className="rounded-full border border-foreground/10 px-2 py-1">Clear</button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl lg:max-w-5xl space-y-6 px-5 pt-5">
        <section className="space-y-3 rounded-3xl border border-foreground/5 bg-card p-5">
          <p className="text-xs font-bold uppercase tracking-widest text-foreground/50">Delivery channels</p>

          <Toggle
            title="Push notifications"
            sub={
              pushUnsupported ? "Not supported on this browser"
              : pushBlocked ? "Blocked — enable in browser site settings"
              : prefs.push ? "Live alerts on this device" : "Get instant alerts on this device"
            }
            checked={prefs.push}
            disabled={pushBlocked || pushUnsupported}
            onChange={togglePush}
          />

          <Toggle
            title="SMS alerts"
            sub={prefs.phone ? `Sent to ${prefs.phone}` : "Add a number below to enable"}
            checked={prefs.sms && !!prefs.phone}
            disabled={!prefs.phone}
            onChange={toggleSMS}
          />
          <input
            value={prefs.phone}
            onChange={(e) => setPhone(e.target.value.replace(/[^\d+\s-]/g, ""))}
            placeholder="+91 98765 43210"
            inputMode="tel"
            className="w-full rounded-2xl border border-foreground/10 bg-background px-4 py-3 font-mono text-sm tracking-wider focus:outline-none focus:ring-2 focus:ring-sg-green/40"
          />
        </section>

        <section className="space-y-3 rounded-3xl border border-foreground/5 bg-card p-5">
          <p className="text-xs font-bold uppercase tracking-widest text-foreground/50">What to notify me about</p>
          <Toggle
            title="Booking changes"
            sub="Reservations, payments, session start & end"
            checked={prefs.bookingUpdates}
            onChange={(v) => writePrefs({ ...prefs, bookingUpdates: v })}
          />
          <Toggle
            title="Complaint updates"
            sub="Ticket received, under review, resolved"
            checked={prefs.complaintUpdates}
            onChange={(v) => writePrefs({ ...prefs, complaintUpdates: v })}
          />
        </section>

        <section className="space-y-3">
          <h2 className="text-sm font-bold uppercase tracking-widest text-foreground/50">Recent</h2>
          {items.length === 0 && (
            <p className="rounded-2xl border border-dashed border-foreground/10 p-6 text-center text-xs text-foreground/50">
              No notifications yet.
            </p>
          )}
          <ul className="space-y-2">
            {items.map((n) => (
              <li key={n.id} className={"rounded-2xl border bg-card p-4 " + (n.read ? "border-foreground/5" : "border-sg-green/40")}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-bold">{n.title}</p>
                    <p className="mt-0.5 text-xs text-foreground/65">{n.body}</p>
                    <p className="mt-1 text-[10px] uppercase tracking-wider text-foreground/40">
                      {new Date(n.createdAt).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })} · via {n.channels.join(" + ")}
                    </p>
                  </div>
                  {n.topic === "booking" && n.refId && (
                    <Link to="/bookings" className="shrink-0 rounded-full bg-foreground/5 px-3 py-1 text-[10px] font-bold uppercase">View</Link>
                  )}
                  {n.topic === "complaint" && n.refId && (
                    <Link
                      to="/ticket/$ticketId"
                      params={{ ticketId: n.refId }}
                      className="shrink-0 rounded-full bg-foreground/5 px-3 py-1 text-[10px] font-bold uppercase"
                    >
                      Track
                    </Link>
                  )}
                  {n.topic === "complaint" && !n.refId && (
                    <Link to="/feedback" className="shrink-0 rounded-full bg-foreground/5 px-3 py-1 text-[10px] font-bold uppercase">View</Link>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </section>

        <p className="pt-2 text-center text-[10px] text-foreground/40">
          SMS delivery is simulated in this prototype · push uses your browser's native notifications
        </p>
      </main>
      <BottomNav />
    </div>
  );
}

function Toggle({ title, sub, checked, onChange, disabled }: {
  title: string; sub: string; checked: boolean; onChange: (v: boolean) => void; disabled?: boolean;
}) {
  return (
    <div className={"flex items-center justify-between gap-3 " + (disabled ? "opacity-60" : "")}>
      <div className="min-w-0">
        <p className="text-sm font-bold">{title}</p>
        <p className="text-[11px] text-foreground/55">{sub}</p>
      </div>
      <button
        type="button"
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={"relative h-7 w-12 shrink-0 rounded-full transition " + (checked ? "bg-sg-green" : "bg-foreground/15")}
        aria-pressed={checked}
      >
        <span className={"absolute top-0.5 size-6 rounded-full bg-background shadow transition-all " + (checked ? "left-[22px]" : "left-0.5")} />
      </button>
    </div>
  );
}