import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import OperatorNav from "@/components/OperatorNav";
import {
  useOperator,
  useAllotments,
  operatorZone,
  buildBayGrid,
  createAllotment,
  findActiveByVehicle,
  parseQr,
  resolveBookingFromQr,
  type QrPayload,
  type Allotment,
} from "@/lib/operator";
import { formatINR, updateBooking, useBookings, getZone, type Booking } from "@/lib/parking";
import CheckoutDialog from "@/components/CheckoutDialog";

type Search = { bay?: string };

export const Route = createFileRoute("/operator/allot")({
  head: () => ({ meta: [{ title: "Allot Bay — GMC SmartPark" }] }),
  validateSearch: (s: Record<string, unknown>): Search => ({
    bay: typeof s.bay === "string" ? s.bay : undefined,
  }),
  component: AllotPage,
});

function AllotPage() {
  const { operator } = useOperator();
  const allots = useAllotments();
  const bookings = useBookings();
  const navigate = useNavigate();
  const { bay: presetBay } = Route.useSearch();
  const zone = operator ? operatorZone(operator) : undefined;

  const [mode, setMode] = useState<"manual" | "qr">("manual");
  const [bay, setBay] = useState<string>(presetBay ?? "");
  const [vehicle, setVehicle] = useState("");
  const [feedback, setFeedback] = useState<{ kind: "ok" | "err"; msg: string } | null>(null);
  const [recent, setRecent] = useState<Allotment | null>(null);
  const [checkout, setCheckout] = useState<Allotment | null>(null);
  const [validate, setValidate] = useState<{ booking: Booking; scannedPlate?: string } | null>(null);

  useEffect(() => {
    if (presetBay) setBay(presetBay);
  }, [presetBay]);

  const grid = useMemo(
    () => (zone ? buildBayGrid(zone, allots, bookings) : []),
    [zone, allots, bookings],
  );
  const freeBays = grid.filter((c) => c.status === "free").map((c) => c.label);
  const checkedInBookingIds = new Set(
    allots.filter((a) => !a.checkOutAt && a.bookingId).map((a) => a.bookingId!),
  );
  const pending = bookings.filter(
    (b) =>
      zone &&
      b.zoneId === zone.id &&
      (b.status === "active" || b.status === "reserved") &&
      !checkedInBookingIds.has(b.id),
  );

  if (!operator || !zone) return null;

  function allot(
    source: "manual" | "qr",
    payload: { bay?: string; vehicle: string; qr?: QrPayload },
  ) {
    if (!zone || !operator) return;
    const cleanV = payload.vehicle.trim().toUpperCase();
    if (!cleanV) {
      setFeedback({ kind: "err", msg: "Vehicle number is required." });
      return;
    }
    // Pre-paid check-in: validate booking, ensure zone matches, prevent re-use.
    let prepaidAmount: number | undefined;
    let prepaidHours: number | undefined;
    let bookingId: string | undefined;
    if (payload.qr?.bookingId) {
      // Booked sessions are validated through the confirm-dialog, not allotted here.
      setFeedback({ kind: "err", msg: "Use the validation dialog for booked sessions." });
      return;
    }
    const existing = findActiveByVehicle(cleanV, zone.id);
    if (existing) {
      setFeedback({
        kind: "err",
        msg: `${cleanV} is already parked at Bay ${existing.bay}.`,
      });
      return;
    }
    let chosenBay = payload.bay?.trim();
    if (!chosenBay) {
      chosenBay = freeBays[0];
    }
    if (!chosenBay) {
      setFeedback({ kind: "err", msg: "No free bays available right now." });
      return;
    }
    // Pre-paid bookings reserved a specific bay; honour it even if visualised
    // as occupied in the demo grid.
    if (!bookingId && grid.find((c) => c.label === chosenBay)?.occupied) {
      setFeedback({ kind: "err", msg: `Bay ${chosenBay} is occupied.` });
      return;
    }
    const a = createAllotment({
      zoneId: zone.id,
      bay: chosenBay,
      vehicleNumber: cleanV,
      operatorId: operator.id,
      source,
      ratePerHour: zone.ratePerHour,
      bookingId,
      prepaidAmount,
      prepaidHours,
    });
    setRecent(a);
    setFeedback({
      kind: "ok",
      msg: `Allotted ${cleanV} → Bay ${chosenBay}.`,
    });
    setVehicle("");
    setBay("");
    navigate({ to: "/operator/allot", search: {} });
  }

  function openValidateFromQr(p: QrPayload) {
    if (!p.bookingId) {
      // Walk-in QR (plate only) — treat as manual allot
      allot("qr", { bay: p.bay, vehicle: p.vehicle, qr: p });
      return;
    }
    const b = resolveBookingFromQr(p);
    if (!b) {
      setFeedback({ kind: "err", msg: `Booking ${p.bookingId} not found.` });
      return;
    }
    if (b.zoneId !== zone!.id) {
      setFeedback({
        kind: "err",
        msg: `Booking is for ${getZone(b.zoneId)?.name ?? b.zoneId}, not your zone.`,
      });
      return;
    }
    if (b.status === "completed" || b.status === "cancelled") {
      setFeedback({ kind: "err", msg: `Booking is ${b.status}; cannot check in.` });
      return;
    }
    if (checkedInBookingIds.has(b.id)) {
      setFeedback({ kind: "err", msg: `${b.vehicleNumber} already checked in.` });
      return;
    }
    setFeedback(null);
    setValidate({ booking: b, scannedPlate: p.vehicle });
  }

  function confirmValidation() {
    if (!validate || !operator || !zone) return;
    const b = validate.booking;
    const a = createAllotment({
      zoneId: zone.id,
      bay: b.bay,
      vehicleNumber: b.vehicleNumber,
      operatorId: operator.id,
      source: "qr",
      ratePerHour: zone.ratePerHour,
      bookingId: b.id,
      prepaidAmount: b.amount,
      prepaidHours: b.hours,
    });
    updateBooking(b.id, { status: "active" });
    setRecent(a);
    setFeedback({
      kind: "ok",
      msg: `Validated ${b.vehicleNumber} · Bay ${b.bay} · pre-paid ${formatINR(b.amount)} for ${b.hours}h.`,
    });
    setValidate(null);
  }

  return (
    <div className="min-h-screen bg-background pb-28 font-sans text-foreground">
      <header className="sticky top-0 z-30 border-b border-foreground/5 bg-background/90 backdrop-blur">
        <div className="mx-auto max-w-3xl px-5 py-4">
          <p className="text-[10px] font-bold uppercase tracking-widest text-foreground/40">Check-in</p>
          <h1 className="text-lg font-bold tracking-tight">Allot bay · {zone.name}</h1>
        </div>
      </header>

      <main className="mx-auto max-w-3xl space-y-6 px-5 pt-5">
        <div className="inline-flex w-full rounded-2xl border border-foreground/10 bg-card p-1 text-xs font-bold uppercase tracking-wider">
          {(["manual", "qr"] as const).map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={
                "flex-1 rounded-xl py-2 transition " +
                (mode === m ? "bg-sg-green text-sg-green-foreground" : "text-foreground/55")
              }
            >
              {m === "manual" ? "Manual" : "Scan QR"}
            </button>
          ))}
        </div>

        {feedback ? (
          <p
            className={
              "rounded-2xl px-4 py-3 text-xs font-medium " +
              (feedback.kind === "ok"
                ? "bg-sg-green/10 text-sg-green"
                : "bg-destructive/10 text-destructive")
            }
          >
            {feedback.msg}
          </p>
        ) : null}

        {mode === "manual" ? (
          <ManualForm
            bay={bay}
            setBay={setBay}
            vehicle={vehicle}
            setVehicle={setVehicle}
            freeBays={freeBays}
            onSubmit={() => allot("manual", { bay, vehicle })}
          />
        ) : (
          <QrScan
            onResult={(p) => openValidateFromQr(p)}
            onError={(msg) => setFeedback({ kind: "err", msg })}
          />
        )}

        {pending.length > 0 ? (
          <section className="rounded-3xl border border-amber-400/30 bg-amber-50/40 p-5 dark:bg-amber-500/5">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold uppercase tracking-widest text-amber-700 dark:text-amber-400">
                Awaiting check-in
              </h2>
              <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-300">
                {pending.length}
              </span>
            </div>
            <p className="mt-1 text-[11px] text-foreground/55">
              Paid bookings reserved at your zone. Scan the user's QR or validate manually.
            </p>
            <ul className="mt-3 divide-y divide-foreground/5">
              {pending.slice(0, 6).map((b) => (
                <li key={b.id} className="flex items-center justify-between py-3">
                  <div>
                    <p className="font-mono text-sm font-bold">{b.vehicleNumber}</p>
                    <p className="text-[11px] text-foreground/55">
                      Bay {b.bay} · {b.hours}h · {formatINR(b.amount)} paid
                    </p>
                  </div>
                  <button
                    onClick={() => setValidate({ booking: b })}
                    className="rounded-full bg-amber-500 px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-white"
                  >
                    Validate
                  </button>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        <section className="rounded-3xl border border-foreground/5 bg-card p-5">
          <h2 className="text-sm font-bold uppercase tracking-widest text-foreground/50">Active sessions</h2>
          <ul className="mt-3 divide-y divide-foreground/5">
            {allots
              .filter((a) => a.zoneId === zone.id && !a.checkOutAt)
              .slice(0, 6)
              .map((a) => (
                <li key={a.id} className="flex items-center justify-between py-3">
                  <div>
                    <p className="font-mono text-sm font-bold">{a.vehicleNumber}</p>
                    <p className="text-[11px] text-foreground/55">Bay {a.bay} · {timeAgo(a.checkInAt)}</p>
                  </div>
                  <button
                    onClick={() => {
                      setCheckout(a);
                    }}
                    className="rounded-full bg-foreground px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-background"
                  >
                    Pay & out
                  </button>
                </li>
              ))}
            {allots.filter((a) => a.zoneId === zone.id && !a.checkOutAt).length === 0 ? (
              <li className="py-6 text-center text-xs text-foreground/40">No active sessions in your zone.</li>
            ) : null}
          </ul>
        </section>

        {recent ? (
          <section className="rounded-3xl border border-sg-green/40 bg-sg-green/5 p-5 text-sm">
            <p className="text-[10px] font-bold uppercase tracking-widest text-sg-green">Last action</p>
            <p className="mt-1 font-mono font-bold">{recent.vehicleNumber} · Bay {recent.bay}</p>
            <p className="text-xs text-foreground/60">
              {recent.checkOutAt
                ? `Checked out · ${formatINR(recent.amount ?? 0)}`
                : `Checked in · ${new Date(recent.checkInAt).toLocaleTimeString()}`}
            </p>
          </section>
        ) : null}
      </main>
      <OperatorNav />
      {checkout && (
        <CheckoutDialog
          allotment={checkout}
          onClose={() => setCheckout(null)}
          onPaid={(done) => {
            setRecent(done);
            setFeedback({
              kind: "ok",
              msg: `Checked out ${done.vehicleNumber}. Collected ${formatINR(done.amount ?? 0)}.`,
            });
          }}
        />
      )}
      {validate && (
        <ValidateDialog
          booking={validate.booking}
          scannedPlate={validate.scannedPlate}
          onClose={() => setValidate(null)}
          onConfirm={confirmValidation}
        />
      )}
    </div>
  );
}

function ManualForm({
  bay,
  setBay,
  vehicle,
  setVehicle,
  freeBays,
  onSubmit,
}: {
  bay: string;
  setBay: (v: string) => void;
  vehicle: string;
  setVehicle: (v: string) => void;
  freeBays: string[];
  onSubmit: () => void;
}) {
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit();
      }}
      className="space-y-4 rounded-3xl border border-foreground/5 bg-card p-5 shadow-ambient-sm"
    >
      <label className="block">
        <span className="text-[11px] font-bold uppercase tracking-widest text-foreground/50">Vehicle number</span>
        <input
          value={vehicle}
          onChange={(e) => setVehicle(e.target.value.toUpperCase())}
          placeholder="AS-01-BK-4921"
          className="mt-2 w-full rounded-2xl border border-foreground/10 bg-background px-4 py-3 font-mono text-sm font-bold tracking-wider focus:outline-none focus:ring-2 focus:ring-sg-green/40"
        />
      </label>
      <label className="block">
        <span className="text-[11px] font-bold uppercase tracking-widest text-foreground/50">Bay</span>
        <select
          value={bay}
          onChange={(e) => setBay(e.target.value)}
          className="mt-2 w-full rounded-2xl border border-foreground/10 bg-background px-4 py-3 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-sg-green/40"
        >
          <option value="">Auto-pick next free bay</option>
          {freeBays.map((b) => (
            <option key={b} value={b}>
              {b}
            </option>
          ))}
        </select>
      </label>
      <button
        type="submit"
        className="w-full rounded-2xl bg-sg-green py-3 text-sm font-bold uppercase tracking-widest text-sg-green-foreground shadow-ambient-md transition-transform active:scale-[0.98]"
      >
        Allot bay
      </button>
    </form>
  );
}

function QrScan({
  onResult,
  onError,
}: {
  onResult: (p: QrPayload) => void;
  onError: (msg: string) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [running, setRunning] = useState(false);
  const [manualText, setManualText] = useState("");
  const scannerRef = useRef<{ stop: () => Promise<void>; clear: () => void } | null>(null);

  async function start() {
    if (!containerRef.current) return;
    try {
      const { Html5Qrcode } = await import("html5-qrcode");
      const id = "operator-qr-region";
      containerRef.current.id = id;
      const scanner = new Html5Qrcode(id);
      scannerRef.current = {
        stop: () => scanner.stop().catch(() => undefined),
        clear: () => scanner.clear(),
      };
      await scanner.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 240, height: 240 } },
        (decoded) => {
          const parsed = parseQr(decoded);
          if (!parsed) {
            onError("QR not recognised. Expected SMARTPARK or a vehicle plate.");
            return;
          }
          scanner.stop().then(() => {
            setRunning(false);
            scanner.clear();
            onResult(parsed);
          });
        },
        () => undefined,
      );
      setRunning(true);
    } catch (e) {
      onError("Could not start camera. Use manual entry below.");
    }
  }

  async function stop() {
    if (scannerRef.current) {
      await scannerRef.current.stop();
      scannerRef.current.clear();
      scannerRef.current = null;
    }
    setRunning(false);
  }

  useEffect(() => {
    return () => {
      if (scannerRef.current) {
        scannerRef.current.stop().then(() => scannerRef.current?.clear());
      }
    };
  }, []);

  return (
    <div className="space-y-4 rounded-3xl border border-foreground/5 bg-card p-5 shadow-ambient-sm">
      <div
        ref={containerRef}
        className="grid aspect-square w-full place-items-center overflow-hidden rounded-2xl bg-foreground/5 text-xs text-foreground/40"
      >
        {!running ? "Camera preview will appear here" : null}
      </div>
      <div className="flex gap-2">
        {!running ? (
          <button
            onClick={start}
            className="flex-1 rounded-2xl bg-sg-green py-3 text-sm font-bold uppercase tracking-widest text-sg-green-foreground shadow-ambient-md"
          >
            Start scan
          </button>
        ) : (
          <button
            onClick={stop}
            className="flex-1 rounded-2xl bg-foreground py-3 text-sm font-bold uppercase tracking-widest text-background"
          >
            Stop
          </button>
        )}
      </div>
      <div className="rounded-2xl bg-background p-3">
        <p className="text-[11px] font-bold uppercase tracking-widest text-foreground/50">Or enter QR text</p>
        <div className="mt-2 flex gap-2">
          <input
            value={manualText}
            onChange={(e) => setManualText(e.target.value)}
            placeholder="SMARTPARK:V=AS01BK4921;B=A-03"
            className="flex-1 rounded-xl border border-foreground/10 bg-card px-3 py-2 font-mono text-xs focus:outline-none focus:ring-2 focus:ring-sg-green/40"
          />
          <button
            onClick={() => {
              const p = parseQr(manualText);
              if (!p) onError("Could not parse that QR text.");
              else {
                onResult(p);
                setManualText("");
              }
            }}
            className="rounded-xl bg-sg-green px-4 text-[11px] font-bold uppercase tracking-wider text-sg-green-foreground"
          >
            Submit
          </button>
        </div>
      </div>
    </div>
  );
}

function timeAgo(ts: number) {
  const mins = Math.max(1, Math.round((Date.now() - ts) / 60000));
  if (mins < 60) return `${mins} min ago`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${h}h ${m}m ago`;
}

function ValidateDialog({
  booking,
  scannedPlate,
  onClose,
  onConfirm,
}: {
  booking: Booking;
  scannedPlate?: string;
  onClose: () => void;
  onConfirm: () => void;
}) {
  const zone = getZone(booking.zoneId);
  const normalize = (s: string) => s.replace(/[^A-Z0-9]/gi, "").toUpperCase();
  const plateMatches = scannedPlate
    ? normalize(scannedPlate) === normalize(booking.vehicleNumber)
    : true;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-foreground/40 p-3 backdrop-blur-sm sm:items-center">
      <div className="w-full max-w-md rounded-3xl bg-card p-6 shadow-2xl">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-amber-600">
              Validate check-in
            </p>
            <h2 className="mt-1 text-lg font-bold tracking-tight">Booking #{booking.id}</h2>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-1 text-foreground/50 hover:bg-foreground/5"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <p className="mt-2 text-xs text-foreground/60">
          Match the user's vehicle and bay before confirming. No payment needed — this booking is pre-paid.
        </p>

        <div className="mt-5 space-y-3 rounded-2xl bg-background p-4 text-sm">
          <Row k="Vehicle" v={booking.vehicleNumber} mono />
          <Row k="Bay" v={booking.bay} />
          <Row k="Zone" v={zone?.name ?? booking.zoneId} />
          <Row k="Duration" v={`${booking.hours} hours`} />
          <Row k="Pre-paid" v={formatINR(booking.amount)} />
          {scannedPlate ? (
            <Row
              k="Scanned plate"
              v={scannedPlate}
              mono
              tone={plateMatches ? "text-sg-green" : "text-destructive"}
            />
          ) : null}
        </div>

        {!plateMatches ? (
          <p className="mt-3 rounded-xl bg-destructive/10 px-3 py-2 text-[11px] font-medium text-destructive">
            Scanned plate does not match booking. Re-check the QR or refuse entry.
          </p>
        ) : null}

        <div className="mt-5 flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 rounded-2xl border border-foreground/10 py-3 text-sm font-bold"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 rounded-2xl bg-sg-green py-3 text-sm font-bold uppercase tracking-widest text-sg-green-foreground shadow-ambient-md"
          >
            Confirm check-in
          </button>
        </div>
      </div>
    </div>
  );
}

function Row({ k, v, mono, tone }: { k: string; v: string; mono?: boolean; tone?: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-[11px] font-bold uppercase tracking-wider text-foreground/45">{k}</span>
      <span className={(mono ? "font-mono " : "") + "text-sm font-bold " + (tone ?? "")}>{v}</span>
    </div>
  );
}