import type { HTMLAttributes, ReactNode } from "react";

export type FluidCardProps = HTMLAttributes<HTMLElement> & {
  children: ReactNode;
  /** Defaults to article */
  as?: "article" | "section" | "div";
};

/**
 * §29.1 / §29.4 — @container host for OpportunityCard / TouchButton children
 */
export function FluidCard({
  children,
  as: Tag = "article",
  className = "",
  ...rest
}: FluidCardProps) {
  return (
    <Tag
      data-testid="fluid-card"
      className={[
        "opportunity-card rounded-lux-md border border-lux-border bg-lux-elevated p-4",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      {...rest}
    >
      {children}
    </Tag>
  );
}
