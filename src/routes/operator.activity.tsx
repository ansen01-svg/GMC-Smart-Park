import { createFileRoute } from "@tanstack/react-router";
import OperatorNav from "@/components/OperatorNav";
import {
  useOperator,
  useAllotments,
  operatorZone,
  startOfDay,
  useToday,
  type Allotment,
} from "@/lib/operator";
import { formatINR } from "@/lib/parking";
import { useState } from "react";
import CheckoutDialog from "@/components/CheckoutDialog";

export const Route = createFileRoute("/operator/activity")({
  head: () => ({ meta: [{ title: "Activity — GMC SmartPark" }] }),
  component: ActivityPage,
});

function ActivityPage() {
  const { operator } = useOperator();
  const allots = useAllotments();
  const now = useToday();
  const zone = operator ? operatorZone(operator) : undefined;
  const [checkout, setCheckout] = useState<Allotment | null>(null);
  if (!operator || !zone) return null;

  const mine = allots.filter((a) => a.zoneId === operator.zoneId);
  const active = mine.filter((a) => !a.checkOutAt);
  const today = mine.filter((a) => a.checkInAt >= startOfDay(now));
  const closedToday = today.filter((a) => a.checkOutAt);
  const revenue = today.reduce((s, a) => s + (a.amount ?? 0), 0);

  return (
    <div className="min-h-screen bg-background pb-28 font-sans text-foreground">
      <header className="sticky top-0 z-30 border-b border-foreground/5 bg-background/90 backdrop-blur">
        <div className="mx-auto max-w-3xl px-5 py-4">
          <h1 className="text-lg font-bold tracking-tight">Shift activity</h1>
          <p className="text-xs text-foreground/55">{zone.name}</p>
        </div>
      </header>
      <main className="mx-auto max-w-3xl space-y-6 px-5 pt-5">
        <section className="grid grid-cols-3 gap-3">
          <Stat k="Active" v={String(active.length)} />
          <Stat k="Closed today" v={String(closedToday.length)} />
          <Stat k="Revenue" v={formatINR(revenue)} tone="text-sg-green" />
        </section>

        <Section title={`Active sessions (${active.length})`}>
          {active.length === 0 ? (
            <Empty msg="No active sessions. Allot a bay to get started." />
          ) : (
            active.map((a) => (
              <Row
                key={a.id}
                title={a.vehicleNumber}
                meta={`Bay ${a.bay} · in ${fmtTime(a.checkInAt)} · ${a.source.toUpperCase()}`}
                action={
                  <button
                    onClick={() => setCheckout(a)}
                    className="rounded-full bg-sg-green px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-sg-green-foreground"
                  >
                    Pay & out
                  </button>
                }
              />
            ))
          )}
        </Section>

        <Section title={`Closed today (${closedToday.length})`}>
          {closedToday.length === 0 ? (
            <Empty msg="No closed sessions yet today." />
          ) : (
            closedToday.map((a) => (
              <Row
                key={a.id}
                title={a.vehicleNumber}
                meta={`Bay ${a.bay} · ${fmtTime(a.checkInAt)} → ${fmtTime(a.checkOutAt!)}`}
                action={<span className="text-sm font-bold tabular-nums text-sg-green">{formatINR(a.amount ?? 0)}</span>}
              />
            ))
          )}
        </Section>
      </main>
      <OperatorNav />
      {checkout && (
        <CheckoutDialog allotment={checkout} onClose={() => setCheckout(null)} />
      )}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-2">
      <h3 className="text-sm font-bold uppercase tracking-widest text-foreground/50">{title}</h3>
      <div className="overflow-hidden rounded-3xl border border-foreground/5 bg-card">{children}</div>
    </section>
  );
}

function Row({ title, meta, action }: { title: string; meta: string; action: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-foreground/5 px-5 py-3 last:border-b-0">
      <div className="min-w-0">
        <p className="truncate text-sm font-bold">{title}</p>
        <p className="truncate text-[11px] text-foreground/55">{meta}</p>
      </div>
      {action}
    </div>
  );
}

function Empty({ msg }: { msg: string }) {
  return <p className="px-5 py-6 text-center text-xs text-foreground/45">{msg}</p>;
}

function Stat({ k, v, tone }: { k: string; v: string; tone?: string }) {
  return (
    <div className="rounded-2xl border border-foreground/5 bg-card p-4">
      <p className={"text-lg font-bold tabular-nums " + (tone ?? "")}>{v}</p>
      <p className="text-[10px] font-bold uppercase tracking-wider text-foreground/40">{k}</p>
    </div>
  );
}

function fmtTime(ts: number) {
  return new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}