import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { z } from "zod";
import BottomNav from "@/components/BottomNav";
import { ZONES, getZone, getBooking, useVehicle } from "@/lib/parking";
import { useComplaints, createComplaint, type Complaint } from "@/lib/complaints";
import { fileToCompressedDataUrl } from "@/lib/image";

const searchSchema = z.object({
  zoneId: z.string().optional(),
  bookingId: z.string().optional(),
});

export const Route = createFileRoute("/feedback")({
  head: () => ({ meta: [{ title: "Complaints & Feedback — GMC SmartPark" }] }),
  validateSearch: searchSchema,
  component: FeedbackPage,
});

const categories: Complaint["category"][] = [
  "Wrong billing", "Sensor faulty", "Illegal occupant", "Staff behaviour", "App issue", "Other",
];

const messageSchema = z.string().trim().min(10, "Tell us a bit more (min 10 chars)").max(1000, "Keep it under 1000 characters");

const MAX_PHOTOS = 4;
const MAX_FILE_BYTES = 10 * 1024 * 1024; // 10 MB raw

function FeedbackPage() {
  const { zoneId, bookingId } = Route.useSearch();
  const nav = useNavigate();
  const complaints = useComplaints();
  const [defaultVehicle] = useVehicle();

  // Resolve booking + derive zone if we have a bookingId.
  const linkedBooking = bookingId ? getBooking(bookingId) : undefined;
  const resolvedZoneId = zoneId ?? linkedBooking?.zoneId ?? "";
  const resolvedVehicle = linkedBooking?.vehicleNumber ?? defaultVehicle;
  const linkedZone = resolvedZoneId ? getZone(resolvedZoneId) : undefined;

  // Auto-pick a sensible category based on context.
  const autoCategory: Complaint["category"] =
    bookingId ? "Wrong billing" : zoneId ? "Sensor faulty" : "Wrong billing";

  const [category, setCategory] = useState<Complaint["category"]>(autoCategory);
  const [zone, setZone] = useState<string>(resolvedZoneId);
  const [rating, setRating] = useState<number>(0);
  const [message, setMessage] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState<Complaint | null>(null);
  const [photos, setPhotos] = useState<string[]>([]);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  async function onFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setPhotoError(null);
    const slots = MAX_PHOTOS - photos.length;
    if (slots <= 0) {
      setPhotoError(`Up to ${MAX_PHOTOS} photos`);
      return;
    }
    setProcessing(true);
    const next: string[] = [];
    for (const file of Array.from(files).slice(0, slots)) {
      if (!file.type.startsWith("image/")) {
        setPhotoError("Only image files (JPG, PNG, HEIC, WEBP)");
        continue;
      }
      if (file.size > MAX_FILE_BYTES) {
        setPhotoError("Each photo must be under 10 MB");
        continue;
      }
      try {
        next.push(await fileToCompressedDataUrl(file));
      } catch {
        setPhotoError("Couldn't read one of the photos");
      }
    }
    setPhotos((p) => [...p, ...next]);
    setProcessing(false);
    if (fileRef.current) fileRef.current.value = "";
  }

  function removePhoto(idx: number) {
    setPhotos((p) => p.filter((_, i) => i !== idx));
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = messageSchema.safeParse(message);
    if (!parsed.success) {
      setError(parsed.error.issues[0].message);
      return;
    }
    setError(null);
    const c = createComplaint({
      category,
      message: parsed.data,
      zoneId: zone || undefined,
      bookingId,
      rating: rating || undefined,
      photos: photos.length ? photos : undefined,
    });
    setSent(c);
    setMessage("");
    setRating(0);
    setPhotos([]);
  }

  return (
    <div className="min-h-screen bg-background pb-24 font-sans text-foreground">
      <header className="sticky top-0 z-30 border-b border-foreground/5 bg-background/90 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center gap-3 px-5 py-4">
          <button onClick={() => nav({ to: "/profile" })} className="-ml-2 flex size-9 items-center justify-center">
            <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
          </button>
          <h1 className="text-lg font-bold tracking-tight">Complaints & Feedback</h1>
        </div>
      </header>

      <main className="mx-auto max-w-3xl lg:max-w-5xl space-y-7 px-5 pt-5">
        {(bookingId || zoneId) && !sent && (
          <div className="rounded-3xl border border-sg-green/30 bg-sg-green/5 p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-wider text-sg-green">Pre-filled context</p>
                <p className="mt-1 truncate text-sm font-bold">{linkedZone?.name ?? "Linked zone"}</p>
                <p className="mt-1 text-[11px] text-foreground/65">
                  {bookingId && <>Booking <span className="font-mono font-bold">#{bookingId}</span> · </>}
                  Vehicle <span className="font-mono font-bold">{resolvedVehicle}</span>
                  {linkedBooking && <> · Bay {linkedBooking.bay} · {linkedBooking.hours}h</>}
                </p>
              </div>
              <button
                type="button"
                onClick={() => nav({ to: "/feedback", search: {} })}
                className="shrink-0 rounded-full border border-foreground/10 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-foreground/60"
              >
                Clear
              </button>
            </div>
          </div>
        )}

        {sent && (
          <div className="rounded-3xl border border-sg-green/30 bg-sg-green/5 p-4">
            <p className="text-xs font-bold uppercase tracking-wider text-sg-green">Submitted</p>
            <p className="mt-1 text-sm font-bold">Ticket #{sent.id} routed to GMC operations.</p>
            <p className="mt-1 text-xs text-foreground/60">You'll see updates below as the team reviews it.</p>
          </div>
        )}

        <form onSubmit={submit} className="space-y-5 rounded-3xl border border-foreground/5 bg-card p-5">
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-widest text-foreground/50">Category</label>
            <div className="flex flex-wrap gap-2">
              {categories.map((c) => (
                <button
                  type="button"
                  key={c}
                  onClick={() => setCategory(c)}
                  className={
                    "rounded-full px-3 py-1.5 text-xs font-bold " +
                    (category === c ? "bg-foreground text-background" : "border border-foreground/10 bg-background")
                  }
                >
                  {c}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-widest text-foreground/50">Zone (optional)</label>
            <select
              value={zone}
              onChange={(e) => setZone(e.target.value)}
              className="w-full rounded-2xl border border-foreground/10 bg-background px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-sg-green/40"
            >
              <option value="">— Select a zone —</option>
              {ZONES.map((z) => (
                <option key={z.id} value={z.id}>{z.name}</option>
              ))}
            </select>
            {bookingId && (
              <p className="text-[10px] text-foreground/50">Linked to booking #{bookingId}</p>
            )}
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-widest text-foreground/50">Rate the experience</label>
            <div className="flex items-center gap-1">
              {[1,2,3,4,5].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setRating(n === rating ? 0 : n)}
                  className="p-1"
                  aria-label={`${n} stars`}
                >
                  <svg viewBox="0 0 24 24" className={"size-7 " + (n <= rating ? "fill-sg-green stroke-sg-green" : "fill-none stroke-foreground/25")} strokeWidth="2" strokeLinejoin="round">
                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                  </svg>
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-widest text-foreground/50">Tell us what happened</label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={5}
              maxLength={1000}
              placeholder="Share specifics — time, bay, vehicle, what went wrong…"
              className="w-full rounded-2xl border border-foreground/10 bg-background px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-sg-green/40"
            />
            <div className="flex justify-between text-[10px] text-foreground/40">
              <span>{error ? <span className="text-danger font-bold">{error}</span> : "Resolved typically within 24–48 hrs"}</span>
              <span>{message.length}/1000</span>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-widest text-foreground/50">
              Attach evidence <span className="text-foreground/40">· optional</span>
            </label>
            <div className="grid grid-cols-4 gap-2">
              {photos.map((src, i) => (
                <div key={i} className="relative aspect-square overflow-hidden rounded-xl border border-foreground/10 bg-background">
                  <button type="button" onClick={() => setPreview(src)} className="block size-full">
                    <img src={src} alt={`Evidence ${i + 1}`} className="size-full object-cover" />
                  </button>
                  <button
                    type="button"
                    onClick={() => removePhoto(i)}
                    aria-label="Remove photo"
                    className="absolute right-1 top-1 flex size-5 items-center justify-center rounded-full bg-foreground text-background"
                  >
                    <svg viewBox="0 0 24 24" className="size-3" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
                  </button>
                </div>
              ))}
              {photos.length < MAX_PHOTOS && (
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  disabled={processing}
                  className="flex aspect-square flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-foreground/20 bg-background text-foreground/55"
                >
                  {processing ? (
                    <span className="text-[10px] font-bold uppercase tracking-wider">…</span>
                  ) : (
                    <>
                      <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/>
                        <circle cx="12" cy="13" r="4"/>
                      </svg>
                      <span className="text-[10px] font-bold uppercase tracking-wider">Add</span>
                    </>
                  )}
                </button>
              )}
            </div>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              multiple
              capture="environment"
              className="hidden"
              onChange={(e) => onFiles(e.target.files)}
            />
            <p className="text-[10px] text-foreground/40">
              {photoError ? <span className="text-danger font-bold">{photoError}</span>
                : `${photos.length}/${MAX_PHOTOS} photos · compressed on-device before upload`}
            </p>
          </div>

          <button type="submit" className="w-full rounded-2xl bg-sg-green py-3 text-sm font-bold text-sg-green-foreground">
            Submit to GMC
          </button>
        </form>

        <section className="space-y-3">
          <h2 className="text-sm font-bold uppercase tracking-widest text-foreground/50">Your tickets</h2>
          {complaints.length === 0 && (
            <p className="rounded-2xl border border-dashed border-foreground/10 p-6 text-center text-xs text-foreground/50">
              No tickets yet.
            </p>
          )}
          <ul className="space-y-2">
            {complaints.map((c) => {
              const z = c.zoneId ? getZone(c.zoneId) : undefined;
              const tone =
                c.status === "resolved" ? "bg-sg-green/15 text-sg-green"
                : c.status === "in_review" ? "bg-accent/15 text-accent"
                : "bg-foreground/10 text-foreground/70";
              return (
                <li key={c.id} className="rounded-2xl border border-foreground/5 bg-card p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-foreground/40">#{c.id} · {c.category}</p>
                      <p className="mt-1 text-sm">{c.message}</p>
                      <p className="mt-1 text-[10px] text-foreground/50">
                        {z?.name ?? "No zone"} · {new Date(c.createdAt).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}
                      </p>
                      {c.photos && c.photos.length > 0 && (
                        <div className="mt-2 flex gap-1.5">
                          {c.photos.map((src, i) => (
                            <button
                              key={i}
                              type="button"
                              onClick={() => setPreview(src)}
                              className="size-14 overflow-hidden rounded-lg border border-foreground/10"
                            >
                              <img src={src} alt={`Ticket ${c.id} evidence ${i + 1}`} className="size-full object-cover" />
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-2">
                      <span className={"rounded-full px-2 py-0.5 text-[10px] font-bold uppercase " + tone}>
                        {c.status.replace("_", " ")}
                      </span>
                      <Link
                        to="/ticket/$ticketId"
                        params={{ ticketId: c.id }}
                        className="rounded-full bg-foreground px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-background"
                      >
                        Track
                      </Link>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </section>

        <p className="text-center text-[10px] text-foreground/40">
          For emergencies dial 112 · GMC helpline 1800-345-3631
        </p>

        <div className="text-center">
          <Link to="/profile" className="text-xs font-bold text-foreground/60">← Back to profile</Link>
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
          <button
            type="button"
            onClick={() => setPreview(null)}
            aria-label="Close preview"
            className="absolute right-4 top-4 flex size-10 items-center justify-center rounded-full bg-background text-foreground"
          >
            <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
          </button>
        </div>
      )}
      <BottomNav />
    </div>
  );
}
