import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import BottomNav from "@/components/BottomNav";
import { useComplaint, updateComplaintStatus, type Complaint } from "@/lib/complaints";
import { getZone, getBooking } from "@/lib/parking";

export const Route = createFileRoute("/ticket/$ticketId")({
  head: () => ({ meta: [{ title: "Ticket tracker — GMC SmartPark" }] }),
  component: TicketTrackerPage,
});

const STAGES: { key: Complaint["status"]; label: string; sub: string }[] = [
  { key: "open", label: "Received", sub: "Logged at the control room" },
  { key: "in_review", label: "In review", sub: "Field team investigating" },
  { key: "resolved", label: "Resolved", sub: "Verified and closed" },
];

function TicketTrackerPage() {
  const { ticketId } = Route.useParams();
  const nav = useNavigate();
  const ticket = useComplaint(ticketId);
  const [now, setNow] = useState(() => Date.now());
  const [preview, setPreview] = useState<string | null>(null);

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  if (!ticket) {
    return (
      <div className="min-h-screen bg-background pb-24 font-sans text-foreground">
        <Header onBack={() => nav({ to: "/feedback" })} title="Ticket not found" />
        <main className="mx-auto max-w-3xl lg:max-w-5xl px-5 pt-10 text-center">
          <p className="text-sm text-foreground/60">We couldn't find ticket #{ticketId}.</p>
          <Link to="/feedback" className="mt-4 inline-block rounded-full bg-foreground px-4 py-2 text-xs font-bold text-background">
            Back to complaints
          </Link>
        </main>
        <BottomNav />
      </div>
    );
  }

  const zone = ticket.zoneId ? getZone(ticket.zoneId) : undefined;
  const booking = ticket.bookingId ? getBooking(ticket.bookingId) : undefined;
  const stageIndex = STAGES.findIndex((s) => s.key === ticket.status);
  const progress = ticket.status === "resolved" ? 100 : ticket.status === "in_review" ? 66 : 33;

  const updates = [...(ticket.updates ?? [])].sort((a, b) => b.at - a.at);
  const isLive = ticket.status !== "resolved";
  const eta = ticket.etaAt ?? ticket.createdAt + 24 * 60 * 60 * 1000;
  const etaDelta = eta - now;

  return (
    <div className="min-h-screen bg-background pb-24 font-sans text-foreground">
      <Header onBack={() => nav({ to: "/feedback" })} title={`Ticket #${ticket.id}`} />

      <main className="mx-auto max-w-3xl lg:max-w-5xl space-y-5 px-5 pt-5">
        <section className="rounded-3xl border border-foreground/5 bg-card p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-wider text-foreground/40">{ticket.category}</p>
              <p className="mt-1 text-base font-bold">{zone?.name ?? "No zone linked"}</p>
              <p className="mt-1 text-[11px] text-foreground/55">
                Filed {timeAgo(now - ticket.createdAt)} ago
                {ticket.assignedTo && <> · Owner <span className="font-bold text-foreground/75">{ticket.assignedTo}</span></>}
              </p>
            </div>
            <span className={
              "shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider " +
              (ticket.status === "resolved"
                ? "bg-sg-green/15 text-sg-green"
                : ticket.status === "in_review"
                  ? "bg-accent/15 text-accent"
                  : "bg-foreground/10 text-foreground/70")
            }>
              {isLive && <span className="mr-1 inline-block size-1.5 animate-pulse rounded-full bg-current align-middle" />}
              {ticket.status.replace("_", " ")}
            </span>
          </div>

          <div className="mt-5">
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-foreground/10">
              <div
                className={
                  "h-full rounded-full transition-all duration-700 " +
                  (ticket.status === "resolved" ? "bg-sg-green" : "bg-accent")
                }
                style={{ width: `${progress}%` }}
              />
            </div>
            <ol className="mt-3 grid grid-cols-3 gap-2">
              {STAGES.map((s, i) => {
                const active = i <= stageIndex;
                return (
                  <li key={s.key} className="text-center">
                    <div className={
                      "mx-auto flex size-7 items-center justify-center rounded-full text-[11px] font-bold " +
                      (active ? (s.key === "resolved" ? "bg-sg-green text-sg-green-foreground" : "bg-accent text-accent-foreground") : "bg-foreground/10 text-foreground/50")
                    }>
                      {active && s.key === "resolved" ? "✓" : i + 1}
                    </div>
                    <p className={"mt-1 text-[11px] font-bold " + (active ? "text-foreground" : "text-foreground/45")}>{s.label}</p>
                    <p className="text-[10px] text-foreground/45">{s.sub}</p>
                  </li>
                );
              })}
            </ol>
          </div>

          {isLive ? (
            <div className="mt-5 flex items-center justify-between rounded-2xl bg-background/60 px-4 py-3">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-foreground/45">Target resolution</p>
                <p className="mt-0.5 text-sm font-bold">
                  {etaDelta > 0 ? `in ${fmtDelta(etaDelta)}` : `overdue by ${fmtDelta(-etaDelta)}`}
                </p>
              </div>
              <span className="text-[10px] uppercase tracking-wider text-foreground/45">Live</span>
            </div>
          ) : (
            <div className="mt-5 rounded-2xl bg-sg-green/10 px-4 py-3">
              <p className="text-[10px] font-bold uppercase tracking-wider text-sg-green">Closed</p>
              <p className="mt-0.5 text-sm font-bold">
                Resolved in {fmtDelta((updates[0]?.at ?? now) - ticket.createdAt)}
              </p>
            </div>
          )}
        </section>

        <section className="space-y-3 rounded-3xl border border-foreground/5 bg-card p-5">
          <p className="text-xs font-bold uppercase tracking-widest text-foreground/50">Your report</p>
          <p className="text-sm leading-relaxed">{ticket.message}</p>
          {booking && (
            <Link
              to="/pay/$bookingId"
              params={{ bookingId: booking.id }}
              className="inline-flex items-center gap-2 rounded-full border border-foreground/10 px-3 py-1.5 text-[11px] font-bold"
            >
              Booking #{booking.id} · Bay {booking.bay}
            </Link>
          )}
          {ticket.photos && ticket.photos.length > 0 && (
            <div className="flex flex-wrap gap-2 pt-1">
              {ticket.photos.map((src, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setPreview(src)}
                  className="size-16 overflow-hidden rounded-xl border border-foreground/10"
                >
                  <img src={src} alt={`Evidence ${i + 1}`} className="size-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </section>

        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold uppercase tracking-widest text-foreground/50">Timeline</h2>
            {isLive && (
              <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-sg-green">
                <span className="size-1.5 animate-pulse rounded-full bg-sg-green" /> Live
              </span>
            )}
          </div>
          <ol className="relative space-y-3 border-l border-foreground/10 pl-5">
            {updates.map((u, i) => {
              const dotTone =
                u.status === "resolved" ? "bg-sg-green"
                : u.status === "in_review" ? "bg-accent"
                : "bg-foreground/40";
              return (
                <li key={u.at + "-" + i} className="relative rounded-2xl border border-foreground/5 bg-card p-4">
                  <span className={"absolute -left-[27px] top-5 size-3 rounded-full ring-4 ring-background " + dotTone} />
                  <p className="text-[10px] font-bold uppercase tracking-wider text-foreground/45">
                    {u.status.replace("_", " ")} · {new Date(u.at).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}
                  </p>
                  <p className="mt-1 text-sm">{u.note}</p>
                </li>
              );
            })}
          </ol>
        </section>

        {ticket.status === "resolved" && (
          <button
            onClick={() => updateComplaintStatus(ticket.id, "open")}
            className="w-full rounded-2xl border border-foreground/15 py-3 text-sm font-bold"
          >
            Reopen ticket
          </button>
        )}

        <div className="text-center">
          <Link to="/feedback" className="text-xs font-bold text-foreground/60">← All tickets</Link>
        </div>
      </main>

      {preview && (
        <div
          role="dialog"
          aria-modal="true"
          onClick={() => setPreview(null)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/80 p-4"
        >
          <img src={preview} alt="Evidence preview" className="max-h-full max-w-full rounded-2xl" />
        </div>
      )}

      <BottomNav />
    </div>
  );
}

function Header({ onBack, title }: { onBack: () => void; title: string }) {
  return (
    <header className="sticky top-0 z-30 border-b border-foreground/5 bg-background/90 backdrop-blur">
      <div className="mx-auto flex max-w-3xl items-center gap-3 px-5 py-4">
        <button onClick={onBack} className="-ml-2 flex size-9 items-center justify-center">
          <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
        </button>
        <h1 className="text-lg font-bold tracking-tight">{title}</h1>
      </div>
    </header>
  );
}

function fmtDelta(ms: number) {
  const s = Math.floor(ms / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${sec}s`;
  return `${sec}s`;
}
function timeAgo(ms: number) {
  return fmtDelta(Math.max(0, ms));
}