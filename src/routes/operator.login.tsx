import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { listDemoOperators, operatorLogin } from "@/lib/operator";

export const Route = createFileRoute("/operator/login")({
  head: () => ({ meta: [{ title: "Operator Sign-in — GMC SmartPark" }] }),
  component: OperatorLoginPage,
});

function OperatorLoginPage() {
  const [id, setId] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const demo = listDemoOperators();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const op = operatorLogin(id, password);
    if (!op) {
      setError("Invalid operator ID or PIN.");
      return;
    }
    setError(null);
  }

  return (
    <div className="min-h-screen bg-background font-sans text-foreground">
      <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-5 py-10">
        <div className="mb-8 text-center">
          <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-sg-green text-sg-green-foreground shadow-ambient-md">
            <svg viewBox="0 0 24 24" className="size-7" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="6" width="18" height="13" rx="2" />
              <path d="M3 10h18M7 15h2M12 15h5" />
            </svg>
          </div>
          <h1 className="mt-4 text-2xl font-bold tracking-tight">Operator Console</h1>
          <p className="mt-1 text-xs uppercase tracking-widest text-foreground/50">GMC SmartPark · Bay staff sign-in</p>
        </div>

        <form onSubmit={submit} className="space-y-4 rounded-3xl border border-foreground/5 bg-card p-6 shadow-ambient-sm">
          <label className="block">
            <span className="text-[11px] font-bold uppercase tracking-widest text-foreground/50">Operator ID</span>
            <input
              value={id}
              onChange={(e) => setId(e.target.value.toUpperCase())}
              placeholder="OP001"
              className="mt-2 w-full rounded-2xl border border-foreground/10 bg-background px-4 py-3 font-mono text-sm font-bold tracking-wider focus:outline-none focus:ring-2 focus:ring-sg-green/40"
            />
          </label>
          <label className="block">
            <span className="text-[11px] font-bold uppercase tracking-widest text-foreground/50">PIN</span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••"
              className="mt-2 w-full rounded-2xl border border-foreground/10 bg-background px-4 py-3 font-mono text-sm font-bold tracking-widest focus:outline-none focus:ring-2 focus:ring-sg-green/40"
            />
          </label>
          {error ? (
            <p className="rounded-xl bg-destructive/10 px-3 py-2 text-xs font-medium text-destructive">{error}</p>
          ) : null}
          <button
            type="submit"
            className="w-full rounded-2xl bg-sg-green py-3 text-sm font-bold uppercase tracking-widest text-sg-green-foreground shadow-ambient-md transition-transform active:scale-[0.98]"
          >
            Start shift
          </button>
        </form>

        <div className="mt-6 rounded-2xl border border-dashed border-foreground/15 bg-card/60 p-4">
          <p className="text-[10px] font-bold uppercase tracking-widest text-foreground/50">Demo accounts</p>
          <ul className="mt-2 space-y-1 text-xs text-foreground/70">
            {demo.map((d) => (
              <li key={d.id} className="flex items-center justify-between">
                <span className="font-mono font-bold">{d.id}</span>
                <span className="truncate">{d.name}</span>
                <span className="font-mono text-foreground/40">PIN 1234</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}