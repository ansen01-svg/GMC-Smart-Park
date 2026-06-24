import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo } from "react";
import OperatorNav from "@/components/OperatorNav";
import ParkingLot, { type LotCell, computeSingleLaneBlocked } from "@/components/ParkingLot";
import {
  useOperator,
  useAllotments,
  operatorZone,
  buildBayGrid,
  startOfDay,
  useToday,
} from "@/lib/operator";
import { formatINR, useBookings } from "@/lib/parking";

export const Route = createFileRoute("/operator/")({
  head: () => ({ meta: [{ title: "Bay Console — GMC SmartPark" }] }),
  component: OperatorDashboard,
});

function OperatorDashboard() {
  const { operator } = useOperator();
  const allots = useAllotments();
  const bookings = useBookings();
  const now = useToday();
  const zone = operator ? operatorZone(operator) : undefined;
  const navigate = useNavigate();

  const grid = useMemo(
    () => (zone ? buildBayGrid(zone, allots, bookings) : []),
    [zone, allots, bookings],
  );
  const blockedSet = useMemo(() => {
    if (!zone || zone.layout !== "single-lane") return new Set<string>();
    return computeSingleLaneBlocked(grid);
  }, [zone, grid]);
  const dayStart = startOfDay(now);
  const todayAllots = allots.filter((a) => a.checkInAt >= dayStart && a.zoneId === operator?.zoneId);
  const active = todayAllots.filter((a) => !a.checkOutAt).length;
  const completed = todayAllots.filter((a) => a.checkOutAt).length;
  const revenue = todayAllots.reduce((s, a) => s + (a.amount ?? 0), 0);

  if (!operator || !zone) return null;

  const free = grid.filter((c) => c.status === "free").length;
  const reserved = grid.filter((c) => c.status === "reserved").length;
  const activeBays = grid.filter((c) => c.status === "active").length;

  return (
    <div className="min-h-screen bg-background pb-28 font-sans text-foreground">
      <header className="sticky top-0 z-30 border-b border-foreground/5 bg-background/90 backdrop-blur">
        <div className="mx-auto max-w-3xl px-5 py-4">
          <p className="text-[10px] font-bold uppercase tracking-widest text-foreground/40">Operator console</p>
          <h1 className="text-lg font-bold tracking-tight">{zone.name}</h1>
        </div>
      </header>

      <main className="mx-auto max-w-3xl space-y-6 px-5 pt-5">
        <section className="grid grid-cols-4 gap-3">
          <Stat k="Free" v={String(free)} tone="text-sg-green" />
          <Stat k="Reserved" v={String(reserved)} tone="text-amber-600" />
          <Stat k="Active" v={String(activeBays)} />
          <Stat k="Today ₹" v={formatINR(revenue).replace("₹", "")} />
        </section>

        <section className="rounded-3xl border border-foreground/5 bg-card p-5 shadow-ambient-sm">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold uppercase tracking-widest text-foreground/50">Lot view</h2>
              <p className="mt-1 text-xs text-foreground/55">Tap a free bay to allot manually.</p>
            </div>
            <Link
              to="/operator/allot"
              className="rounded-full bg-sg-green px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-sg-green-foreground"
            >
              Scan QR
            </Link>
          </div>
          <ParkingLot
            layout={zone.layout}
            cells={grid.map<LotCell>((c) => ({
              label: c.label,
              status:
                c.status === "free" && blockedSet.has(c.label) ? "blocked" : c.status,
              floor: c.floor,
              title:
                c.status === "reserved"
                  ? `Reserved · awaiting check-in (booking ${c.bookingId})`
                  : c.status === "active"
                    ? "Active session"
                    : blockedSet.has(c.label)
                      ? "Blocked — bay ahead in lane is occupied"
                      : "Free — tap to allot",
            }))}
            onPick={(label) =>
              navigate({ to: "/operator/allot", search: { bay: label } })
            }
          />
          <div className="mt-4 flex flex-wrap items-center gap-4 text-[11px] text-foreground/55">
            <span className="flex items-center gap-1.5"><span className="size-3 rounded bg-sg-green/30" />Free</span>
            <span className="flex items-center gap-1.5"><span className="size-3 rounded bg-amber-400/40 ring-1 ring-amber-400/60" />Reserved</span>
            <span className="flex items-center gap-1.5"><span className="size-3 rounded bg-foreground" />Active</span>
            {zone.layout === "single-lane" && (
              <span className="flex items-center gap-1.5"><span className="size-3 rounded bg-foreground/10 ring-1 ring-foreground/20" />Blocked</span>
            )}
          </div>
        </section>

        <section className="grid grid-cols-2 gap-3">
          <MiniStat k="Sessions today" v={String(todayAllots.length)} />
          <MiniStat k="Active now" v={String(active)} tone="text-sg-green" />
          <MiniStat k="Completed" v={String(completed)} />
          <MiniStat k="Rate / hr" v={formatINR(zone.ratePerHour)} />
        </section>
      </main>
      <OperatorNav />
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

function MiniStat({ k, v, tone }: { k: string; v: string; tone?: string }) {
  return (
    <div className="rounded-2xl border border-foreground/5 bg-card p-4">
      <p className={"text-base font-bold tabular-nums " + (tone ?? "")}>{v}</p>
      <p className="text-[10px] font-bold uppercase tracking-wider text-foreground/40">{k}</p>
    </div>
  );
}

