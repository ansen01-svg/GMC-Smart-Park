import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import QRCode from "qrcode";
import BottomNav from "@/components/BottomNav";
import { getBooking, updateBooking, getZone, formatINR, type Booking } from "@/lib/parking";

export const Route = createFileRoute("/pay/$bookingId")({
  head: () => ({ meta: [{ title: "Payment — GMC SmartPark" }] }),
  component: PayPage,
});

const methods = [
  { id: "UPI", label: "UPI", sub: "GPay · PhonePe · BHIM" },
  { id: "FASTag", label: "FASTag", sub: "Auto-deduct at exit" },
  { id: "Wallet", label: "Wallet", sub: "Paytm · Mobikwik" },
  { id: "Card", label: "Card", sub: "Visa · Mastercard · Rupay" },
] as const;

function PayPage() {
  const { bookingId } = Route.useParams();
  const nav = useNavigate();
  const [booking, setBooking] = useState<Booking | undefined>(undefined);
  const [method, setMethod] = useState<(typeof methods)[number]["id"]>("UPI");
  const [paying, setPaying] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    const b = getBooking(bookingId);
    setBooking(b);
  }, [bookingId]);

  if (!booking) {
    return (
      <div className="min-h-screen bg-background p-10 text-center text-sm text-foreground/60">
        Loading booking…
      </div>
    );
  }
  const zone = getZone(booking.zoneId);

  function pay() {
    setPaying(true);
    setTimeout(() => {
      updateBooking(booking!.id, { status: "active", paymentMethod: method, paidAt: Date.now() });
      setDone(true);
      setPaying(false);
    }, 1100);
  }

  if (done) {
    return (
      <div className="min-h-screen bg-background pb-24 font-sans text-foreground">
        <main className="mx-auto flex max-w-3xl flex-col items-center px-5 pt-16 text-center">
          <div className="flex size-20 items-center justify-center rounded-full bg-sg-green/15">
            <svg viewBox="0 0 24 24" className="size-10 text-sg-green" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12l5 5L20 7" /></svg>
          </div>
          <h1 className="mt-6 text-2xl font-bold tracking-tight">Payment confirmed</h1>
          <p className="mt-1 text-sm text-foreground/55">Bay {booking.bay} held for you at {zone?.name}.</p>

          <div className="mt-8 w-full max-w-sm rounded-3xl border border-foreground/5 bg-card p-5 text-left">
            <p className="text-[10px] font-bold uppercase tracking-wider text-foreground/40">Digital ticket</p>
            <p className="mt-1 text-xl font-bold tracking-tight">#{booking.id}</p>
            <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
              <Field k="Vehicle" v={booking.vehicleNumber} />
              <Field k="Bay" v={booking.bay} />
              <Field k="Duration" v={`${booking.hours} hours`} />
              <Field k="Paid via" v={method} />
              <Field k="Amount" v={formatINR(booking.amount)} />
              <Field k="Status" v="Active" tone="text-sg-green" />
            </div>
            <CheckInQR booking={booking} />
            <p className="mt-2 text-center text-[10px] uppercase tracking-widest text-foreground/40">
              Show this QR to the operator at Bay {booking.bay}
            </p>
          </div>

          <div className="mt-6 flex gap-2">
            <Link to="/bookings" className="rounded-2xl bg-foreground px-5 py-3 text-sm font-bold text-background">View bookings</Link>
            {zone && (
              <a
                href={`https://www.google.com/maps/dir/?api=1&destination=${zone.lat},${zone.lng}&travelmode=driving`}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-2xl border border-foreground/10 px-5 py-3 text-sm font-bold"
              >
                Navigate
              </a>
            )}
            <Link
              to="/feedback"
              search={{ bookingId: booking.id, zoneId: booking.zoneId }}
              className="rounded-2xl border border-foreground/10 px-5 py-3 text-sm font-bold"
            >
              Report issue
            </Link>
          </div>
        </main>
        <BottomNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24 font-sans text-foreground">
      <header className="sticky top-0 z-30 border-b border-foreground/5 bg-background/90 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center gap-3 px-5 py-4">
          <button onClick={() => nav({ to: "/zone/$zoneId", params: { zoneId: booking.zoneId } })} className="-ml-2 flex size-9 items-center justify-center">
            <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
          </button>
          <h1 className="text-lg font-bold tracking-tight">Checkout</h1>
        </div>
      </header>

      <main className="mx-auto max-w-3xl lg:max-w-5xl space-y-6 px-5 pt-5">
        <section className="rounded-3xl border border-foreground/5 bg-card p-5">
          <p className="text-[10px] font-bold uppercase tracking-wider text-foreground/40">Reservation</p>
          <p className="mt-1 text-base font-bold">{zone?.name}</p>
          <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
            <Field k="Bay" v={booking.bay} />
            <Field k="Vehicle" v={booking.vehicleNumber} />
            <Field k="Duration" v={`${booking.hours} hours`} />
            <Field k="Rate" v={`${formatINR(zone?.ratePerHour ?? 0)}/hr`} />
          </div>
          <div className="mt-5 flex items-center justify-between border-t border-foreground/5 pt-4">
            <span className="text-sm font-medium text-foreground/60">Total payable</span>
            <span className="text-2xl font-bold tracking-tight">{formatINR(booking.amount)}</span>
          </div>
        </section>

        <section className="space-y-3">
          <h3 className="text-sm font-bold uppercase tracking-widest text-foreground/50">Payment method</h3>
          <div className="grid grid-cols-2 gap-2">
            {methods.map((m) => {
              const active = method === m.id;
              return (
                <button
                  key={m.id}
                  onClick={() => setMethod(m.id)}
                  className={
                    "rounded-2xl border p-4 text-left transition " +
                    (active ? "border-sg-green bg-sg-green/5" : "border-foreground/10 bg-card")
                  }
                >
                  <p className="text-sm font-bold">{m.label}</p>
                  <p className="mt-0.5 text-[10px] text-foreground/50">{m.sub}</p>
                </button>
              );
            })}
          </div>
        </section>
      </main>

      <div className="fixed inset-x-0 bottom-16 z-30 border-t border-foreground/10 bg-background/95 px-5 py-3 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-foreground/40">Pay via {method}</p>
            <p className="text-lg font-bold">{formatINR(booking.amount)}</p>
          </div>
          <button onClick={pay} disabled={paying} className="rounded-2xl bg-sg-green px-6 py-3 text-sm font-bold text-sg-green-foreground disabled:opacity-60">
            {paying ? "Processing…" : "Pay & Confirm"}
          </button>
        </div>
      </div>

      <BottomNav />
    </div>
  );
}

function Field({ k, v, tone }: { k: string; v: string; tone?: string }) {
  return (
    <div>
      <p className="text-[10px] font-bold uppercase tracking-wider text-foreground/40">{k}</p>
      <p className={"mt-0.5 text-sm font-bold " + (tone ?? "")}>{v}</p>
    </div>
  );
}

function CheckInQR({ booking }: { booking: Booking }) {
  const [url, setUrl] = useState<string>("");
  useEffect(() => {
    const plate = booking.vehicleNumber.replace(/[^A-Z0-9]/gi, "").toUpperCase();
    const payload = `SMARTPARK:BK=${booking.id};V=${plate};B=${booking.bay};Z=${booking.zoneId};A=${booking.amount};H=${booking.hours}`;
    QRCode.toDataURL(payload, {
      errorCorrectionLevel: "M",
      margin: 1,
      width: 360,
      color: { dark: "#1a0b2e", light: "#ffffff" },
    })
      .then(setUrl)
      .catch(() => setUrl(""));
  }, [booking]);
  return (
    <div className="mt-5 flex aspect-square w-full max-w-[200px] items-center justify-center self-center rounded-2xl bg-white p-3 shadow-inner">
      {url ? (
        <img src={url} alt="Check-in QR" className="size-full" />
      ) : (
        <div className="size-full animate-pulse rounded-lg bg-foreground/10" />
      )}
    </div>
  );
}
