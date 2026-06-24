import { createFileRoute, Link, useNavigate, notFound } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import BottomNav from "@/components/BottomNav";
import ParkingLot, { type LotCell, computeSingleLaneBlocked } from "@/components/ParkingLot";
import { getZone, createBooking, useVehicle, formatINR, ZONES } from "@/lib/parking";

export const Route = createFileRoute("/zone/$zoneId")({
  head: ({ params }) => {
    const z = ZONES.find((x) => x.id === params.zoneId);
    return { meta: [{ title: (z?.name ?? "Zone") + " — GMC SmartPark" }] };
  },
  loader: ({ params }) => {
    const z = getZone(params.zoneId);
    if (!z) throw notFound();
    return z;
  },
  notFoundComponent: () => (
    <div className="p-10 text-center text-sm text-foreground/60">Zone not found.</div>
  ),
  component: ZoneDetail,
});

function ZoneDetail() {
  const zone = Route.useLoaderData();
  const nav = useNavigate();
  const [vehicle, setVehicle] = useVehicle();
  const [hours, setHours] = useState(2);
  const [bayPick, setBayPick] = useState<string | null>(null);

  const bays = useMemo(() => {
    const arr: { id: string; free: boolean; floor?: string }[] = [];
    const mark = (id: string, seed: number, floor?: string) => {
      arr.push({ id, free: seed % 7 > 1, floor });
    };
    if (zone.layout === "single-lane") {
      for (let i = 1; i <= 14; i++) {
        mark(`L-${String(i).padStart(2, "0")}`, i + zone.availableBays);
      }
    } else if (zone.layout === "multi-floor") {
      const floors = Math.max(1, zone.floors ?? 2);
      for (let f = 1; f <= floors; f++) {
        for (let i = 1; i <= 12; i++) {
          mark(
            `F${f}-${String(i).padStart(2, "0")}`,
            f * 5 + i + zone.availableBays,
            `F${f}`,
          );
        }
      }
    } else {
      const rows = ["A", "B", "C", "D"];
      rows.forEach((r) => {
        for (let i = 1; i <= 8; i++) {
          mark(`${r}-${String(i).padStart(2, "0")}`, r.charCodeAt(0) + i + zone.availableBays);
        }
      });
    }
    return arr;
  }, [zone.id, zone.layout, zone.floors, zone.availableBays]);

  // For single-lane lots, mark bays sitting behind an already-occupied bay
  // as blocked so the user can't book a bay they couldn't physically reach.
  const blocked = useMemo(() => {
    if (zone.layout !== "single-lane") return new Set<string>();
    return computeSingleLaneBlocked(
      bays.map((b) => ({
        label: b.id,
        status: b.free ? ("free" as const) : ("taken" as const),
      })),
    );
  }, [bays, zone.layout]);

  const total = hours * zone.ratePerHour;
  const pickIsBlocked = bayPick ? blocked.has(bayPick) : false;
  const canReserve = !!bayPick && !pickIsBlocked && zone.availableBays > 0;

  function reserve() {
    if (!canReserve) return;
    const b = createBooking({
      zoneId: zone.id,
      bay: bayPick!,
      vehicleNumber: vehicle,
      startsAt: Date.now(),
      hours,
      amount: total,
    });
    nav({ to: "/pay/$bookingId", params: { bookingId: b.id } });
  }

  return (
    <div className="min-h-screen bg-background pb-44 font-sans text-foreground">
      <header className="sticky top-0 z-30 border-b border-foreground/5 bg-background/90 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center gap-3 px-5 py-4">
          <Link to="/" className="-ml-2 flex size-9 items-center justify-center">
            <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
          </Link>
          <h1 className="truncate text-base font-bold tracking-tight">{zone.name}</h1>
        </div>
      </header>

      <main className="mx-auto max-w-3xl lg:max-w-5xl space-y-6 px-5 pt-5">
        <section className="rounded-3xl border border-foreground/5 bg-card p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-sg-green">{zone.type}</p>
              <h2 className="mt-1 text-xl font-bold tracking-tight">{zone.area}</h2>
              <p className="mt-1 text-xs text-foreground/55">{zone.distanceKm} km away · {formatINR(zone.ratePerHour)}/hr</p>
            </div>
            <div className="text-right">
              <p className="text-3xl font-bold tabular-nums text-sg-green">{zone.availableBays}</p>
              <p className="text-[10px] font-bold uppercase tracking-wider text-foreground/40">of {zone.totalBays} free</p>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {zone.ev && <Pill>EV charging</Pill>}
            {zone.covered && <Pill>Covered</Pill>}
            <Pill>ANPR enabled</Pill>
            <Pill>24×7</Pill>
          </div>
          <div className="mt-4 flex gap-2">
            <a
              href={`https://www.google.com/maps/dir/?api=1&destination=${zone.lat},${zone.lng}&travelmode=driving`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-foreground py-3 text-sm font-bold text-background"
            >
              <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-9 8-14a8 8 0 10-16 0c0 5 8 14 8 14z"/><circle cx="12" cy="8" r="2.5"/></svg>
              Navigate
            </a>
            <Link
              to="/feedback"
              search={{ zoneId: zone.id }}
              className="flex items-center justify-center rounded-2xl border border-foreground/10 px-4 py-3 text-sm font-bold"
            >
              Report
            </Link>
          </div>
        </section>

        <section className="space-y-3">
          <h3 className="text-sm font-bold uppercase tracking-widest text-foreground/50">Select a bay</h3>
          <div className="rounded-3xl border border-foreground/5 bg-card p-4">
            <ParkingLot
              layout={zone.layout}
              cells={bays.map<LotCell>((b) => ({
                label: b.id,
                floor: b.floor,
                status:
                  bayPick === b.id
                    ? "picked"
                    : blocked.has(b.id)
                      ? "blocked"
                      : b.free
                        ? "free"
                        : "taken",
                title:
                  bayPick === b.id
                    ? `Bay ${b.id} · your pick`
                    : blocked.has(b.id)
                      ? `Bay ${b.id} · blocked by a parked car ahead`
                      : b.free
                        ? `Bay ${b.id} · free`
                        : `Bay ${b.id} · taken`,
              }))}
              onPick={(label) => setBayPick(label)}
            />
            <div className="mt-3 flex flex-wrap items-center gap-3 text-[10px] font-bold uppercase tracking-wider text-foreground/40">
              <span className="flex items-center gap-1"><span className="size-2 rounded-sm bg-emerald-400/40" /> Free</span>
              <span className="flex items-center gap-1"><span className="size-2 rounded-sm bg-white/20" /> Taken</span>
              {zone.layout === "single-lane" && (
                <span className="flex items-center gap-1"><span className="size-2 rounded-sm bg-foreground/10 ring-1 ring-foreground/20" /> Blocked</span>
              )}
              <span className="flex items-center gap-1"><span className="size-2 rounded-sm bg-sky-400" /> Your pick</span>
            </div>
            {zone.layout === "single-lane" && (
              <p className="mt-2 text-[11px] text-foreground/55">
                Single-lane lot — bays behind a parked car can't be reached until the car ahead leaves.
              </p>
            )}
          </div>
        </section>

        <section className="space-y-3">
          <h3 className="text-sm font-bold uppercase tracking-widest text-foreground/50">Duration</h3>
          <div className="flex items-center gap-2">
            {[1, 2, 3, 4, 6, 8].map((h) => (
              <button
                key={h}
                onClick={() => setHours(h)}
                className={
                  "flex-1 rounded-2xl py-3 text-sm font-bold " +
                  (hours === h ? "bg-foreground text-background" : "border border-foreground/10 bg-card")
                }
              >
                {h}h
              </button>
            ))}
          </div>
        </section>

        <section className="space-y-3">
          <h3 className="text-sm font-bold uppercase tracking-widest text-foreground/50">Vehicle</h3>
          <input
            value={vehicle}
            onChange={(e) => setVehicle(e.target.value.toUpperCase())}
            className="w-full rounded-2xl border border-foreground/10 bg-card px-4 py-3 text-sm font-mono font-bold tracking-wider focus:outline-none focus:ring-2 focus:ring-sg-green/40"
          />
        </section>
      </main>

      <div className="fixed inset-x-0 bottom-16 z-30 border-t border-foreground/10 bg-background/95 px-5 py-3 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-foreground/40">Total</p>
            <p className="text-lg font-bold">{formatINR(total)} <span className="text-xs font-medium text-foreground/40">· {hours}h</span></p>
          </div>
          <button
            onClick={reserve}
            disabled={!canReserve}
            className="rounded-2xl bg-sg-green px-6 py-3 text-sm font-bold text-sg-green-foreground disabled:bg-foreground/15 disabled:text-foreground/40"
          >
            {bayPick ? `Reserve ${bayPick}` : "Pick a bay"}
          </button>
        </div>
      </div>

      <BottomNav />
    </div>
  );
}

function Pill({ children }: { children: React.ReactNode }) {
  return <span className="rounded-full border border-foreground/10 bg-background px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-foreground/60">{children}</span>;
}
