import { createFileRoute, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect } from "react";
import { useOperator } from "@/lib/operator";

export const Route = createFileRoute("/operator")({
  head: () => ({ meta: [{ title: "Operator Console — GMC SmartPark" }] }),
  component: OperatorLayout,
});

function OperatorLayout() {
  const { operator, ready } = useOperator();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const onLogin = pathname === "/operator/login";

  useEffect(() => {
    if (!ready) return;
    if (!operator && !onLogin) navigate({ to: "/operator/login" });
    if (operator && onLogin) navigate({ to: "/operator" });
  }, [ready, operator, onLogin, navigate]);

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background text-sm text-foreground/50">
        Loading operator console…
      </div>
    );
  }
  return <Outlet />;
}