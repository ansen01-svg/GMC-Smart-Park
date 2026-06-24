import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import cityMap from "@/assets/city-map.jpg";
import BottomNav from "@/components/BottomNav";
import { ZONES, useVehicle, formatINR } from "@/lib/parking";
import { useNotifications, unreadCount } from "@/lib/notifications";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "GMC SmartPark — Find & Reserve Parking in Guwahati" },
      { name: "description", content: "Discover live parking availability, reserve a bay and pay digitally across Guwahati." },
    ],
  }),
  component: Home,
});

const filters = ["All", "Market", "Office", "Hospital", "Tourist", "Transit"] as const;

function Home() {
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<(typeof filters)[number]>("All");
  const [vehicle] = useVehicle();
  const unread = unreadCount(useNotifications());

  const results = useMemo(() => {
    return ZONES.filter((z) => {
      const matchQ = !q || (z.name + z.area).toLowerCase().includes(q.toLowerCase());
      const matchF = filter === "All" || z.type === filter;
      return matchQ && matchF;
    }).sort((a, b) => a.distanceKm - b.distanceKm);
  }, [q, filter]);

  const totalAvailable = ZONES.reduce((s, z) => s + z.availableBays, 0);

  return (
    <div className="min-h-screen bg-background pb-24 font-sans text-foreground antialiased">
      <header className="sticky top-0 z-30 border-b border-foreground/5 bg-background/85 backdrop-blur-md">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-5 py-3.5">
          <div className="flex items-center gap-2">
            <div className="flex size-8 items-center justify-center rounded-lg bg-foreground">
              <div className="size-3 rounded-sm border-2 border-background" />
            </div>
            <span className="text-base font-bold tracking-tight">
              GMC <span className="text-sg-green">SmartPark</span>
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Link to="/notifications" className="relative flex size-9 items-center justify-center rounded-full border border-foreground/10 bg-card" aria-label="Notifications">
              <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 16v-5a6 6 0 10-12 0v5l-2 2h16l-2-2zM10 20a2 2 0 004 0"/></svg>
              {unread > 0 && (
                <span className="absolute -right-0.5 -top-0.5 flex size-4 items-center justify-center rounded-full bg-sg-green text-[9px] font-bold text-sg-green-foreground">
                  {unread > 9 ? "9+" : unread}
                </span>
              )}
            </Link>
            <Link to="/profile" className="flex size-9 items-center justify-center rounded-full border border-foreground/10 bg-card text-xs font-bold">
              {vehicle.slice(-2) || "GH"}
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl lg:max-w-5xl space-y-7 px-5 pt-5">
        <section className="space-y-1">
          <p className="text-xs font-medium text-foreground/50">Good day, Guwahati</p>
          <h1 className="text-2xl font-bold leading-tight tracking-tight">
            <span className="text-sg-green">{totalAvailable}</span> bays free near you
          </h1>
        </section>

        <section className="space-y-3">
          <div className="relative">
            <svg viewBox="0 0 24 24" className="absolute left-4 top-1/2 size-5 -translate-y-1/2 text-foreground/40" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <circle cx="11" cy="11" r="7" />
              <path d="m20 20-3-3" />
            </svg>
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              type="text"
              placeholder="Search area, market, hospital…"
              className="w-full rounded-2xl border border-foreground/10 bg-card py-4 pl-12 pr-4 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-sg-green/40"
            />
          </div>
          <div className="no-scrollbar -mx-5 flex gap-2 overflow-x-auto px-5 pb-1">
            {filters.map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={
                  "whitespace-nowrap rounded-full px-4 py-2 text-xs font-bold " +
                  (filter === f ? "bg-foreground text-background" : "border border-foreground/10 bg-card text-foreground/70")
                }
              >
                {f}
              </button>
            ))}
          </div>
        </section>

        <section className="space-y-3">
          <div className="relative overflow-hidden rounded-3xl shadow-lg shadow-foreground/10">
            <img src={cityMap} alt="Live mobility map of Guwahati" className="aspect-[16/10] w-full object-cover" />
            <div className="absolute inset-x-3 bottom-3 flex items-center justify-between rounded-2xl bg-card/95 p-3 backdrop-blur">
              <div className="flex items-center gap-2">
                <span className="size-2 animate-pulse rounded-full bg-sg-green" />
                <span className="text-xs font-bold">Live map · {ZONES.length} zones</span>
              </div>
              <Link to="/zones" className="rounded-xl bg-sg-green px-3 py-1.5 text-[11px] font-bold text-sg-green-foreground">
                VIEW ALL
              </Link>
            </div>
          </div>
        </section>

        <section className="space-y-3">
          <div className="flex items-end justify-between">
            <h2 className="text-lg font-bold tracking-tight">Nearby parking</h2>
            <span className="text-xs font-semibold text-foreground/50">{results.length} found</span>
          </div>
          <ul className="grid gap-3 sm:grid-cols-2">
            {results.map((z) => {
              const pct = z.availableBays / z.totalBays;
              const tone = z.availableBays === 0 ? "text-danger" : pct < 0.15 ? "text-danger" : pct < 0.4 ? "text-accent" : "text-sg-green";
              return (
                <li key={z.id}>
                  <Link
                    to="/zone/$zoneId"
                    params={{ zoneId: z.id }}
                    className="block rounded-3xl border border-foreground/5 bg-card p-4 transition active:scale-[0.99]"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-bold">{z.name}</p>
                        <p className="mt-0.5 text-xs text-foreground/55">
                          {z.area} · {z.distanceKm} km · {formatINR(z.ratePerHour)}/hr
                        </p>
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          <Tag>{z.type}</Tag>
                          {z.ev && <Tag>EV</Tag>}
                          {z.covered && <Tag>Covered</Tag>}
                        </div>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className={"text-2xl font-bold tabular-nums " + tone}>{z.availableBays}</p>
                        <p className="text-[10px] font-bold uppercase tracking-wider text-foreground/40">/ {z.totalBays} free</p>
                      </div>
                    </div>
                  </Link>
                </li>
              );
            })}
            {results.length === 0 && (
              <li className="rounded-3xl border border-dashed border-foreground/10 p-6 text-center text-sm text-foreground/50">
                No zones match your search.
              </li>
            )}
          </ul>
        </section>
      </main>

      <BottomNav />
    </div>
  );
}

function Tag({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full bg-foreground/5 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-foreground/60">
      {children}
    </span>
  );
}
