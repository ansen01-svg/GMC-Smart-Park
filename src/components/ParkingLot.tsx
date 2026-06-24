import { useMemo } from "react";

export type LotStatus =
  | "free"
  | "reserved"
  | "active"
  | "taken"
  | "picked"
  | "blocked";
export type LotLayout = "open" | "single-lane" | "multi-floor";

/**
 * For a single-lane lot, returns the set of bay labels that are physically
 * blocked because a bay closer to the entrance is already occupied. Cells
 * are taken in the order given (entrance → dead end).
 */
export function computeSingleLaneBlocked(
  cells: { label: string; status: LotStatus }[],
): Set<string> {
  const blocked = new Set<string>();
  let gateHit = false;
  for (const c of cells) {
    if (gateHit) {
      if (c.status === "free") blocked.add(c.label);
      continue;
    }
    if (
      c.status === "reserved" ||
      c.status === "active" ||
      c.status === "taken"
    ) {
      gateHit = true;
    }
  }
  return blocked;
}

export type LotCell = {
  label: string;
  status: LotStatus;
  title?: string;
  /** Optional floor grouping for multi-floor layouts (e.g. "F1"). */
  floor?: string;
};

// Simple, easy-to-scan parking diagram. The look intentionally stays minimal:
// a clean grid of bays, optionally grouped by floor, or rendered as a single
// lane. This keeps booking obvious and the component maintainable.
export default function ParkingLot({
  cells,
  layout = "open",
  onPick,
}: {
  cells: LotCell[];
  layout?: LotLayout;
  onPick?: (label: string) => void;
}) {
  // Group cells by floor (defaults to a single floor when not provided).
  const floors = useMemo(() => {
    const map = new Map<string, LotCell[]>();
    for (const c of cells) {
      const f = c.floor ?? "";
      if (!map.has(f)) map.set(f, []);
      map.get(f)!.push(c);
    }
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [cells]);

  if (layout === "multi-floor" && floors.length > 1) {
    return (
      <div className="space-y-4">
        {floors.map(([f, group]) => (
          <div key={f} className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="rounded-md bg-foreground/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-foreground/70">
                Floor {f.replace(/^F/, "")}
              </span>
              <span className="text-[10px] text-foreground/40">
                {group.filter((c) => c.status === "free").length} free / {group.length}
              </span>
            </div>
            <SimpleGrid cells={group} onPick={onPick} />
          </div>
        ))}
      </div>
    );
  }

  if (layout === "single-lane") {
    return <SingleLane cells={cells} onPick={onPick} />;
  }

  // Default: open lot — single grid of bays.
  return <SimpleGrid cells={cells} onPick={onPick} />;
}

function SimpleGrid({
  cells,
  onPick,
}: {
  cells: LotCell[];
  onPick?: (label: string) => void;
}) {
  return (
    <div className="grid grid-cols-6 gap-2 sm:grid-cols-8">
      {cells.map((c) => (
        <Slot key={c.label} cell={c} onPick={onPick} />
      ))}
    </div>
  );
}

function SingleLane({
  cells,
  onPick,
}: {
  cells: LotCell[];
  onPick?: (label: string) => void;
}) {
  // One long lane with a clear entry → deep end direction. Bays earlier in
  // the lane physically gate access to the ones behind them.
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-foreground/50">
        <span>← Entry</span>
        <span>Dead end →</span>
      </div>
      <div
        className="h-1.5 rounded-full"
        style={{
          background:
            "repeating-linear-gradient(90deg, hsl(48 96% 60% / .6) 0 12px, transparent 12px 22px)",
        }}
        aria-hidden
      />
      <div className="flex gap-2 overflow-x-auto pb-1">
        {cells.map((c) => (
          <div key={c.label} className="w-14 shrink-0">
            <Slot cell={c} onPick={onPick} />
          </div>
        ))}
      </div>
    </div>
  );
}

function Slot({
  cell,
  onPick,
}: {
  cell: LotCell;
  onPick?: (label: string) => void;
}) {
  const interactive = !!onPick && (cell.status === "free" || cell.status === "picked");

  const fill =
    cell.status === "free"
      ? "bg-emerald-400/15 hover:bg-emerald-400/30 ring-1 ring-emerald-400/30"
      : cell.status === "picked"
        ? "bg-sky-500 text-white ring-2 ring-sky-300"
        : cell.status === "reserved"
          ? "bg-amber-400/35 ring-1 ring-amber-400/50"
          : cell.status === "active"
            ? "bg-foreground text-background"
            : cell.status === "blocked"
              ? "bg-foreground/5 text-foreground/30 ring-1 ring-dashed ring-foreground/15"
              : "bg-foreground/10 text-foreground/40"; // taken

  return (
    <button
      type="button"
      disabled={!interactive}
      onClick={() => onPick?.(cell.label)}
      title={cell.title ?? `Bay ${cell.label} · ${cell.status}`}
      aria-label={`Bay ${cell.label} ${cell.status}`}
      className={
        "flex aspect-square items-center justify-center rounded-lg text-xs font-bold tabular-nums transition " +
        fill +
        (interactive ? " cursor-pointer" : " cursor-not-allowed")
      }
    >
      {cell.status === "blocked" ? "🚧" : cell.label.split("-").slice(-1)[0]}
    </button>
  );
}