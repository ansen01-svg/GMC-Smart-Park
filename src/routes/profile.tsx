import { createFileRoute, Link } from "@tanstack/react-router";
import BottomNav from "@/components/BottomNav";
import { useBookings, useVehicle, formatINR } from "@/lib/parking";
import { useComplaints } from "@/lib/complaints";
import { useNotifications, unreadCount } from "@/lib/notifications";

export const Route = createFileRoute("/profile")({
  head: () => ({ meta: [{ title: "Profile — GMC SmartPark" }] }),
  component: ProfilePage,
});

function ProfilePage() {
  const bookings = useBookings();
  const complaints = useComplaints();
  const notifications = useNotifications();
  const unread = unreadCount(notifications);
  const [vehicle, setVehicle] = useVehicle();
  const spent = bookings.filter((b) => b.status !== "cancelled").reduce((s, b) => s + b.amount, 0);
  const active = bookings.filter((b) => b.status === "active").length;

  return (
    <div className="min-h-screen bg-background pb-24 font-sans text-foreground">
      <header className="sticky top-0 z-30 border-b border-foreground/5 bg-background/90 backdrop-blur">
        <div className="mx-auto max-w-3xl lg:max-w-5xl px-5 py-4">
          <h1 className="text-lg font-bold tracking-tight">Profile</h1>
        </div>
      </header>
      <main className="mx-auto max-w-3xl lg:max-w-5xl space-y-6 px-5 pt-5">
        <section className="flex items-center gap-4 rounded-3xl border border-foreground/5 bg-card p-5">
          <div className="flex size-14 items-center justify-center rounded-full bg-foreground text-base font-bold text-background">
            {(vehicle.slice(-2) || "GH")}
          </div>
          <div>
            <p className="text-base font-bold">Guwahati Resident</p>
            <p className="text-xs text-foreground/55">Verified citizen account</p>
          </div>
        </section>

        <section className="grid grid-cols-3 gap-3">
          <Stat k="Sessions" v={String(bookings.length)} />
          <Stat k="Active" v={String(active)} tone="text-sg-green" />
          <Stat k="Spent" v={formatINR(spent)} />
        </section>

        <section className="space-y-2">
          <h3 className="text-sm font-bold uppercase tracking-widest text-foreground/50">Default vehicle</h3>
          <input
            value={vehicle}
            onChange={(e) => setVehicle(e.target.value.toUpperCase())}
            className="w-full rounded-2xl border border-foreground/10 bg-card px-4 py-3 font-mono text-sm font-bold tracking-wider focus:outline-none focus:ring-2 focus:ring-sg-green/40"
          />
          <p className="text-[10px] text-foreground/50">Used for ANPR matching and FASTag deductions.</p>
        </section>

        <section className="space-y-2">
          <h3 className="text-sm font-bold uppercase tracking-widest text-foreground/50">Account</h3>
          <ul className="overflow-hidden rounded-3xl border border-foreground/5 bg-card divide-y divide-foreground/5">
            <Row to="/notifications" label="Notifications" badge={unread || undefined} />
            <Row to="/feedback" label="Complaints & feedback" badge={complaints.length || undefined} />
            <Row label="FASTag wallet" />
            <Row label="Saved payment methods" />
            <Row label="Resident parking pass" />
            <Row label="Help & support" />
          </ul>
        </section>

        <p className="pt-2 text-center text-[10px] font-medium uppercase tracking-widest text-foreground/40">
          Guwahati Municipal Corporation · Smart Cities Mission
        </p>
        <div className="pt-1 text-center">
          <Link
            to="/operator/login"
            className="text-[10px] font-bold uppercase tracking-widest text-sg-green underline-offset-4 hover:underline"
          >
            Bay operator sign-in →
          </Link>
        </div>
      </main>
      <BottomNav />
    </div>
  );
}

function Stat({ k, v, tone }: { k: string; v: string; tone?: string }) {
  return (
    <div className="rounded-2xl border border-foreground/5 bg-card p-4">
      <p className={"text-xl font-bold tabular-nums " + (tone ?? "")}>{v}</p>
      <p className="text-[10px] font-bold uppercase tracking-wider text-foreground/40">{k}</p>
    </div>
  );
}

function Row({ label, to, badge }: { label: string; to?: "/feedback" | "/notifications"; badge?: number }) {
  const inner = (
    <>
      <span className="flex items-center gap-2">
        {label}
        {badge ? (
          <span className="rounded-full bg-sg-green/15 px-2 py-0.5 text-[10px] font-bold text-sg-green">{badge}</span>
        ) : null}
      </span>
      <svg viewBox="0 0 24 24" className="size-4 text-foreground/30" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9 6l6 6-6 6"/></svg>
    </>
  );
  if (to) {
    return (
      <li>
        <Link to={to} className="flex items-center justify-between px-5 py-4 text-sm font-medium">
          {inner}
        </Link>
      </li>
    );
  }
  return (
    <li className="flex items-center justify-between px-5 py-4 text-sm font-medium text-foreground/70">
      {inner}
    </li>
  );
}
