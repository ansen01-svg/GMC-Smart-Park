import { createFileRoute, Link } from "@tanstack/react-router";
import BottomNav from "@/components/BottomNav";
import { useBookings, getZone, formatINR, updateBooking } from "@/lib/parking";

export const Route = createFileRoute("/bookings")({
  head: () => ({ meta: [{ title: "My Bookings — GMC SmartPark" }] }),
  component: BookingsPage,
});

function BookingsPage() {
  const bookings = useBookings();

  return (
    <div className="min-h-screen bg-background pb-24 font-sans text-foreground">
      <header className="sticky top-0 z-30 border-b border-foreground/5 bg-background/90 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-5 py-4">
          <h1 className="text-lg font-bold tracking-tight">My Bookings</h1>
          <span className="text-xs font-semibold text-foreground/50">{bookings.length} total</span>
        </div>
      </header>

      <main className="mx-auto max-w-3xl lg:max-w-5xl grid gap-3 px-5 pt-5 sm:grid-cols-2">
        {bookings.length === 0 && (
          <div className="rounded-3xl border border-dashed border-foreground/10 p-10 text-center sm:col-span-2">
            <p className="text-sm font-bold">No bookings yet</p>
            <p className="mt-1 text-xs text-foreground/55">Reserve a bay to see it here.</p>
            <Link to="/" className="mt-4 inline-block rounded-xl bg-foreground px-4 py-2 text-xs font-bold text-background">Find parking</Link>
          </div>
        )}
        {bookings.map((b) => {
          const z = getZone(b.zoneId);
          const tone =
            b.status === "active" ? "bg-sg-green/15 text-sg-green"
            : b.status === "reserved" ? "bg-accent/15 text-accent"
            : b.status === "cancelled" ? "bg-danger/10 text-danger"
            : "bg-foreground/10 text-foreground/60";
          return (
            <article key={b.id} className="rounded-3xl border border-foreground/5 bg-card p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-foreground/40">#{b.id}</p>
                  <p className="mt-0.5 truncate text-sm font-bold">{z?.name ?? b.zoneId}</p>
                  <p className="mt-0.5 text-xs text-foreground/55">
                    Bay {b.bay} · {b.hours}h · {new Date(b.startsAt).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}
                  </p>
                  <p className="mt-1 font-mono text-[11px] font-bold tracking-wider text-foreground/70">{b.vehicleNumber}</p>
                </div>
                <div className="text-right">
                  <span className={"inline-block rounded-full px-2 py-0.5 text-[10px] font-bold uppercase " + tone}>{b.status}</span>
                  <p className="mt-2 text-base font-bold">{formatINR(b.amount)}</p>
                </div>
              </div>
              <div className="mt-3 flex gap-2">
                {b.status === "reserved" && (
                  <Link to="/pay/$bookingId" params={{ bookingId: b.id }} className="flex-1 rounded-xl bg-sg-green py-2 text-center text-xs font-bold text-sg-green-foreground">
                    Pay now
                  </Link>
                )}
                {z && (b.status === "reserved" || b.status === "active") && (
                  <a
                    href={`https://www.google.com/maps/dir/?api=1&destination=${z.lat},${z.lng}&travelmode=driving`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 rounded-xl bg-foreground py-2 text-center text-xs font-bold text-background"
                  >
                    Navigate
                  </a>
                )}
                {b.status === "active" && (
                  <button onClick={() => updateBooking(b.id, { status: "completed" })} className="flex-1 rounded-xl bg-foreground py-2 text-xs font-bold text-background">
                    End session
                  </button>
                )}
                {(b.status === "reserved" || b.status === "active") && (
                  <button onClick={() => updateBooking(b.id, { status: "cancelled" })} className="flex-1 rounded-xl border border-foreground/10 py-2 text-xs font-bold text-foreground/70">
                    Cancel
                  </button>
                )}
                <Link
                  to="/feedback"
                  search={{ bookingId: b.id, zoneId: b.zoneId }}
                  className="rounded-xl border border-foreground/10 px-3 py-2 text-xs font-bold text-foreground/70"
                >
                  Report
                </Link>
              </div>
            </article>
          );
        })}
      </main>
      <BottomNav />
    </div>
  );
}
