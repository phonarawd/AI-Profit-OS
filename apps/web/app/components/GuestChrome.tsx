import type { ReactNode } from "react";
import { AuthShell, type AuthShellVariant } from "../../components/spark-dash-auth";

/**
 * Spark Dash guest chrome — Figma Auth split layout (desktop/mobile).
 */
export function GuestChrome({
  children,
  variant = "login",
}: {
  children: ReactNode;
  variant?: AuthShellVariant;
}) {
  return (
    <div
      data-testid="guest-chrome"
      className="fixed inset-0 z-50 overflow-y-auto bg-lux-bg"
    >
      <AuthShell variant={variant}>{children}</AuthShell>
    </div>
  );
}
