import type { HTMLAttributes, ReactNode } from "react";

export type CardProps = HTMLAttributes<HTMLElement> & {
  children: ReactNode;
  as?: "article" | "section" | "div";
};

export function Card({
  children,
  as: Tag = "article",
  className = "",
  ...rest
}: CardProps) {
  return (
    <Tag
      data-testid="pd-card"
      className={[
        "opportunity-card rounded-pd-md border border-pd-border bg-pd-elevated p-4",
        className,
      ].join(" ")}
      {...rest}
    >
      {children}
    </Tag>
  );
}

export type FluidCardProps = CardProps;
export const FluidCard = Card;
