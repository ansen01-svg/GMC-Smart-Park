import { createFileRoute, useNavigate } from "@tanstack/react-router";
import OperatorNav from "@/components/OperatorNav";
import {
  useOperator,
  operatorZone,
  operatorLogout,
  useAllotments,
  startOfDay,
  useToday,
  useShifts,
  formatShiftDuration,
} from "@/lib/operator";
import { formatINR } from "@/lib/parking";

export const Route = createFileRoute("/operator/profile")({
  head: () => ({ meta: [{ title: "Operator Profile — GMC SmartPark" }] }),
  component: OperatorProfilePage,
});

function OperatorProfilePage() {
  const { operator } = useOperator();
  const navigate = useNavigate();
  const allots = useAllotments();
  const now = useToday();
  const zone = operator ? operatorZone(operator) : undefined;
  const shifts = useShifts(operator?.id);
  if (!operator || !zone) return null;

  const today = allots.filter((a) => a.zoneId === operator.zoneId && a.checkInAt >= startOfDay(now));
  const revenue = today.reduce((s, a) => s + (a.amount ?? 0), 0);
  const currentShift = shifts.find((s) => !s.endAt);
  const history = shifts.filter((s) => s.endAt).slice(0, 8);

  return (
    <div className="min-h-screen bg-background pb-28 font-sans text-foreground">
      <header className="sticky top-0 z-30 border-b border-foreground/5 bg-background/90 backdrop-blur">
        <div className="mx-auto max-w-3xl px-5 py-4">
          <h1 className="text-lg font-bold tracking-tight">Operator profile</h1>
        </div>
      </header>
      <main className="mx-auto max-w-3xl space-y-6 px-5 pt-5">
        <section className="flex items-center gap-4 rounded-3xl border border-foreground/5 bg-card p-5">
          <div className="flex size-14 items-center justify-center rounded-full bg-sg-green text-base font-bold text-sg-green-foreground">
            {operator.name.split(" ").map((p) => p[0]).slice(0, 2).join("")}
          </div>
          <div className="flex-1">
            <p className="text-base font-bold">{operator.name}</p>
            <p className="text-xs text-foreground/55">{operator.phone}</p>
            <p className="mt-1 text-[10px] font-bold uppercase tracking-widest text-sg-green">
              {operator.id} · Scheduled {operator.shiftStart}
            </p>
          </div>
        </section>

        <section className="grid grid-cols-3 gap-3">
          <Stat k="Sessions" v={String(today.length)} />
          <Stat k="Revenue" v={formatINR(revenue)} tone="text-sg-green" />
          <Stat k="Rate / hr" v={formatINR(zone.ratePerHour)} />
        </section>

        <section className="space-y-2">
          <h3 className="text-sm font-bold uppercase tracking-widest text-foreground/50">Current shift</h3>
          <div className="rounded-3xl border border-foreground/5 bg-card p-5">
            {currentShift ? (
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-base font-bold tabular-nums">
                    {fmtClock(currentShift.startAt)} <span className="text-foreground/40">→ now</span>
                  </p>
                  <p className="mt-1 text-xs text-foreground/55">Started {fmtDate(currentShift.startAt)}</p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold tabular-nums text-sg-green">
                    {formatShiftDuration(currentShift.startAt)}
                  </p>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-foreground/40">On duty</p>
                </div>
              </div>
            ) : (
              <p className="text-xs text-foreground/55">No active shift.</p>
            )}
          </div>
        </section>

        <section className="space-y-2">
          <h3 className="text-sm font-bold uppercase tracking-widest text-foreground/50">Shift history</h3>
          <div className="overflow-hidden rounded-3xl border border-foreground/5 bg-card">
            {history.length === 0 ? (
              <p className="p-5 text-xs text-foreground/55">No completed shifts yet.</p>
            ) : (
              <ul className="divide-y divide-foreground/5">
                {history.map((s) => (
                  <li key={s.id} className="flex items-center justify-between px-5 py-3">
                    <div>
                      <p className="text-sm font-bold tabular-nums">
                        {fmtClock(s.startAt)} – {fmtClock(s.endAt!)}
                      </p>
                      <p className="text-[11px] text-foreground/55">{fmtDate(s.startAt)}</p>
                    </div>
                    <p className="text-sm font-bold tabular-nums text-foreground/70">
                      {formatShiftDuration(s.startAt, s.endAt)}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>

        <section className="space-y-2">
          <h3 className="text-sm font-bold uppercase tracking-widest text-foreground/50">Assigned bay area</h3>
          <div className="rounded-3xl border border-foreground/5 bg-card p-5">
            <p className="text-base font-bold">{zone.name}</p>
            <p className="text-xs text-foreground/55">{zone.area} · {zone.totalBays} bays</p>
            <div className="mt-3 flex flex-wrap gap-2 text-[10px] font-bold uppercase tracking-wider">
              <span className="rounded-full bg-sg-green/15 px-2.5 py-1 text-sg-green">{zone.type}</span>
              {zone.covered ? <span className="rounded-full bg-foreground/10 px-2.5 py-1">Covered</span> : null}
              {zone.ev ? <span className="rounded-full bg-foreground/10 px-2.5 py-1">EV ready</span> : null}
            </div>
          </div>
        </section>

        <button
          onClick={() => {
            operatorLogout();
            navigate({ to: "/operator/login" });
          }}
          className="w-full rounded-2xl border border-destructive/40 bg-destructive/5 py-3 text-sm font-bold uppercase tracking-widest text-destructive"
        >
          End shift & sign out
        </button>

        <p className="pt-2 text-center text-[10px] font-medium uppercase tracking-widest text-foreground/40">
          GMC SmartPark · Operator console
        </p>
      </main>
      <OperatorNav />
    </div>
  );
}

function fmtClock(ts: number) {
  return new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}
function fmtDate(ts: number) {
  return new Date(ts).toLocaleDateString([], { day: "2-digit", month: "short", year: "numeric" });
}

function Stat({ k, v, tone }: { k: string; v: string; tone?: string }) {
  return (
    <div className="rounded-2xl border border-foreground/5 bg-card p-4">
      <p className={"text-lg font-bold tabular-nums " + (tone ?? "")}>{v}</p>
      <p className="text-[10px] font-bold uppercase tracking-wider text-foreground/40">{k}</p>
    </div>
  );
}