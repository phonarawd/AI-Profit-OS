import type { ElementType, HTMLAttributes, ReactNode } from "react";

type SurfaceProps = HTMLAttributes<HTMLElement> & {
  as?: ElementType;
  children: ReactNode;
  interactive?: boolean;
  href?: string;
};

function cx(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ");
}

export function PremiumSurface({
  as: Component = "section",
  children,
  className,
  ...props
}: SurfaceProps) {
  return (
    <Component className={cx("pt-premium-surface", className)} {...props}>
      {children}
    </Component>
  );
}

export function PremiumCard({
  as: Component = "div",
  children,
  className,
  interactive = false,
  ...props
}: SurfaceProps) {
  return (
    <Component
      className={cx("pt-premium-card", className)}
      data-interactive={interactive ? "true" : "false"}
      {...props}
    >
      {children}
    </Component>
  );
}
