import { Link } from "@tanstack/react-router";

const items = [
  { to: "/", label: "Home", icon: "M3 11l9-8 9 8v10a1 1 0 01-1 1h-5v-7H9v7H4a1 1 0 01-1-1V11z" },
  { to: "/zones", label: "Zones", icon: "M4 6h16M4 12h16M4 18h16" },
  { to: "/bookings", label: "Bookings", icon: "M5 4h14a1 1 0 011 1v15l-4-2-4 2-4-2-4 2V5a1 1 0 011-1z" },
  { to: "/profile", label: "Profile", icon: "M12 12a4 4 0 100-8 4 4 0 000 8zm-7 9a7 7 0 0114 0H5z" },
] as const;

export default function BottomNav() {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-foreground/10 bg-background/90 backdrop-blur-md pb-[env(safe-area-inset-bottom)]">
      <ul className="mx-auto flex max-w-3xl items-stretch justify-between px-2">
        {items.map((it) => (
          <li key={it.to} className="flex-1">
            <Link
              to={it.to}
              activeOptions={{ exact: it.to === "/" }}
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
