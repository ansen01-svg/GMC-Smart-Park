import { Link } from "@tanstack/react-router";

const items = [
  { to: "/operator", label: "Bay", exact: true, icon: "M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z" },
  { to: "/operator/allot", label: "Allot", exact: false, icon: "M12 5v14M5 12h14" },
  { to: "/operator/activity", label: "Activity", exact: false, icon: "M3 12h4l3-8 4 16 3-8h4" },
  { to: "/operator/profile", label: "Profile", exact: false, icon: "M12 12a4 4 0 100-8 4 4 0 000 8zm-7 9a7 7 0 0114 0H5z" },
] as const;

export default function OperatorNav() {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-foreground/10 bg-background/90 backdrop-blur-md pb-[env(safe-area-inset-bottom)]">
      <ul className="mx-auto flex max-w-3xl items-stretch justify-between px-2">
        {items.map((it) => (
          <li key={it.to} className="flex-1">
            <Link
              to={it.to}
              activeOptions={{ exact: it.exact }}
              className="flex flex-col items-center gap-1 py-2.5 text-[10px] font-bold uppercase tracking-wider text-foreground/40 [&.active]:text-sg-green"
            >
              <svg viewBox="0 0 24 24" className="size-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d={it.icon} />
              </svg>
              {it.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}