import { useEffect, useMemo, useState } from "react";
import QRCode from "qrcode";
import {
  type Allotment,
  buildUpiPayload,
  checkOutAllotment,
  previewCheckout,
} from "@/lib/operator";
import { formatINR } from "@/lib/parking";

type Props = {
  allotment: Allotment;
  onClose: () => void;
  onPaid?: (a: Allotment) => void;
};

export default function CheckoutDialog({ allotment, onClose, onPaid }: Props) {
  // tick every 30s so live duration / amount stay accurate while open
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(t);
  }, []);

  const { hours, exactHours, amount, gross, prepaid } = useMemo(
    () => previewCheckout(allotment, now),
    [allotment, now],
  );
  const isPrepaid = (allotment.prepaidAmount ?? 0) > 0;
  const withinPrepaid = isPrepaid && amount === 0;

  const upi = useMemo(
    () =>
      buildUpiPayload({
        amount: Math.max(amount, 1),
        note: `SmartPark overage ${allotment.bay} ${allotment.vehicleNumber}`,
        txnRef: allotment.id,
      }),
    [amount, allotment],
  );

  const [qrUrl, setQrUrl] = useState<string>("");
  useEffect(() => {
    if (withinPrepaid) {
      setQrUrl("");
      return;
    }
    QRCode.toDataURL(upi, {
      errorCorrectionLevel: "M",
      margin: 1,
      width: 360,
      color: { dark: "#1a0b2e", light: "#ffffff" },
    })
      .then(setQrUrl)
      .catch(() => setQrUrl(""));
  }, [upi, withinPrepaid]);

  const [stage, setStage] = useState<"pay" | "done">("pay");
  const [paid, setPaid] = useState<Allotment | null>(null);

  const handleMarkPaid = () => {
    const updated = checkOutAllotment(allotment.id);
    if (updated) {
      setPaid(updated);
      setStage("done");
      onPaid?.(updated);
    }
  };

  const exactMin = Math.max(1, Math.round(exactHours * 60));
  const h = Math.floor(exactMin / 60);
  const m = exactMin % 60;
  const durationLabel = h > 0 ? `${h}h ${m}m` : `${m}m`;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-foreground/40 backdrop-blur-sm sm:items-center"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md overflow-hidden rounded-t-3xl bg-card text-foreground shadow-2xl sm:rounded-3xl"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex items-center justify-between px-5 pt-5">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-foreground/45">
              {stage === "pay" ? "Pay now" : "Payment received"}
            </p>
            <h2 className="text-lg font-bold tracking-tight">
              {allotment.vehicleNumber}
            </h2>
            <p className="text-xs text-foreground/55">
              Bay {allotment.bay} · #{allotment.id}
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-2 text-foreground/50 hover:bg-foreground/5"
            aria-label="Close"
          >
            <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </header>

        {stage === "pay" ? (
          <div className="space-y-4 px-5 pb-6 pt-4">
            <div className="rounded-2xl bg-background/60 p-4 text-sm">
              <Row k="Duration" v={durationLabel} />
              <Row k="Billed hours" v={`${hours} ${hours === 1 ? "hour" : "hours"}`} />
              <Row k="Rate" v={`${formatINR(allotment.ratePerHour)} / hr`} />
              {isPrepaid ? (
                <>
                  <Row k="Gross" v={formatINR(gross)} />
                  <Row k={`Prepaid (${allotment.prepaidHours ?? 0}h)`} v={`− ${formatINR(prepaid)}`} />
                </>
              ) : null}
              <div className="mt-3 flex items-center justify-between border-t border-foreground/10 pt-3">
                <span className="text-xs font-bold uppercase tracking-widest text-foreground/55">
                  {withinPrepaid ? "Settled" : "Amount due"}
                </span>
                <span className="text-2xl font-bold tabular-nums text-sg-green">
                  {formatINR(amount)}
                </span>
              </div>
            </div>

            {withinPrepaid ? (
              <div className="rounded-2xl bg-sg-green/10 p-4 text-center text-sm font-medium text-sg-green">
                Pre-paid in app · no payment needed.<br />
                Confirm check-out to release Bay {allotment.bay}.
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2">
                <div className="rounded-2xl bg-white p-3 shadow-inner">
                  {qrUrl ? (
                    <img src={qrUrl} alt="UPI payment QR" width={220} height={220} />
                  ) : (
                    <div className="size-[220px] animate-pulse rounded-lg bg-foreground/10" />
                  )}
                </div>
                <p className="text-center text-[11px] text-foreground/55">
                  {isPrepaid ? "Overage only · scan with any UPI app" : "Scan with any UPI app · GPay · PhonePe · Paytm"}
                </p>
                <p className="text-[10px] font-bold uppercase tracking-widest text-foreground/40">
                  Ref · {allotment.id}
                </p>
              </div>
            )}

            <div className="flex gap-2">
              <button
                onClick={onClose}
                className="flex-1 rounded-full border border-foreground/10 px-4 py-3 text-xs font-bold uppercase tracking-widest text-foreground/70"
              >
                Cancel
              </button>
              <button
                onClick={handleMarkPaid}
                className="flex-1 rounded-full bg-sg-green px-4 py-3 text-xs font-bold uppercase tracking-widest text-sg-green-foreground"
              >
                {withinPrepaid ? `Confirm check-out` : `Mark paid · ${formatINR(amount)}`}
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4 px-5 pb-6 pt-4 text-center">
            <div className="mx-auto flex size-16 items-center justify-center rounded-full bg-sg-green/15 text-sg-green">
              <svg viewBox="0 0 24 24" className="size-8" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12l5 5L20 7" />
              </svg>
            </div>
            <p className="text-2xl font-bold tabular-nums text-sg-green">
              {formatINR(paid?.amount ?? amount)}
            </p>
            <p className="text-xs text-foreground/55">
              Bay {allotment.bay} released · {allotment.vehicleNumber}
            </p>
            <button
              onClick={onClose}
              className="w-full rounded-full bg-foreground px-4 py-3 text-xs font-bold uppercase tracking-widest text-background"
            >
              Done
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex items-center justify-between py-1 text-sm">
      <span className="text-foreground/55">{k}</span>
      <span className="font-bold tabular-nums">{v}</span>
    </div>
  );
}