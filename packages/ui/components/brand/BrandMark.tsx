import { T } from "../../copy/ko";

export type BrandMarkProps = {
  /** hero = onboarding/landing · compact = auth header */
  size?: "hero" | "compact";
  className?: string;
};

/** Single Brand Kit consumer mark — ADR-011 · text wordmark until asset URL wiring */
export function BrandMark({ size = "compact", className = "" }: BrandMarkProps) {
  const hero = size === "hero";
  return (
    <div
      data-testid="brand-mark"
      data-brand={T.brand.consumer}
      className={`flex flex-col items-center gap-1 ${className}`.trim()}
    >
      <span
        aria-hidden
        className={[
          "inline-flex items-center justify-center rounded-lux-md bg-lux-accent/15 text-lux-accent",
          hero ? "h-16 w-16 text-3xl" : "h-12 w-12 text-2xl",
        ].join(" ")}
      >
        ✦
      </span>
      <p
        className={[
          "font-semibold tracking-tight text-lux-text",
          hero ? "text-3xl" : "text-xl",
        ].join(" ")}
      >
        {T.brand.consumer}
      </p>
    </div>
  );
}
