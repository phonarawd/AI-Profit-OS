import { T } from "../copy/ko";

const MARK = "/spark-dash/brand-spark.svg";
const MARK_MOBILE = "/spark-dash/mobile-brand-spark.svg";

export type PutdukBrandProps = {
  size?: "hero" | "compact" | "mark";
  className?: string;
};

export function PutdukBrand({ size = "compact", className = "" }: PutdukBrandProps) {
  const hero = size === "hero";
  const markOnly = size === "mark";
  return (
    <div
      data-testid="brand-mark"
      data-brand={T.brand.consumer}
      className={`flex items-center gap-2 ${className}`.trim()}
    >
      <img
        src={hero ? MARK : MARK_MOBILE}
        alt=""
        width={hero ? 28 : 18}
        height={hero ? 46 : 28}
      />
      {markOnly ? null : (
        <p className={hero ? "text-3xl font-semibold tracking-tight text-inherit" : "text-xl font-semibold tracking-tight text-inherit"}>
          {T.brand.consumer}
        </p>
      )}
    </div>
  );
}
