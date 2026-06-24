import { createFileRoute, Link } from "@tanstack/react-router";
import BottomNav from "@/components/BottomNav";
import { ZONES, formatINR } from "@/lib/parking";

export const Route = createFileRoute("/zones")({
  head: () => ({ meta: [{ title: "All Zones — GMC SmartPark" }] }),
  component: ZonesPage,
});

function ZonesPage() {
  return (
    <div className="min-h-screen bg-background pb-24 font-sans text-foreground">
      <header className="sticky top-0 z-30 border-b border-foreground/5 bg-background/90 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center gap-3 px-5 py-4">
          <Link to="/" className="-ml-2 flex size-9 items-center justify-center rounded-full">
            <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
          </Link>
          <h1 className="text-lg font-bold tracking-tight">All Parking Zones</h1>
        </div>
      </header>

      <main className="mx-auto max-w-3xl lg:max-w-5xl grid gap-3 px-5 pt-5 sm:grid-cols-2 lg:grid-cols-3">
        {ZONES.map((z) => {
          const pct = z.availableBays / z.totalBays;
          const bar = z.availableBays === 0 ? "bg-danger" : pct < 0.2 ? "bg-danger" : pct < 0.5 ? "bg-accent" : "bg-sg-green";
          return (
            <Link
              key={z.id}
              to="/zone/$zoneId"
              params={{ zoneId: z.id }}
              className="block rounded-3xl border border-foreground/5 bg-card p-4"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold">{z.name}</p>
                  <p className="text-xs text-foreground/55">{z.area} · {z.distanceKm} km</p>
                </div>
                <p className="text-xs font-bold text-foreground/70">{formatINR(z.ratePerHour)}/hr</p>
              </div>
              <div className="mt-3 flex items-center gap-3">
                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-foreground/5">
                  <div className={"h-full " + bar} style={{ width: `${Math.max(2, pct * 100)}%` }} />
                </div>
                <span className="shrink-0 text-xs font-bold tabular-nums">{z.availableBays}/{z.totalBays}</span>
              </div>
            </Link>
          );
        })}
      </main>
      <BottomNav />
    </div>
  );
}
