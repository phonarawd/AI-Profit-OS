import type { SparkDashHomeModel, SparkDashNavItem, SparkDashStat } from "./types";
import { SD_ASSETS } from "./assets";

export function Skel({
  tone = "dark",
  width,
  height,
  radius,
}: {
  tone?: "dark" | "light" | "ink";
  width: string;
  height: string;
  radius?: string;
}) {
  const cls =
    tone === "light" ? "sd-skel is-light" : tone === "ink" ? "sd-skel is-ink" : "sd-skel";
  return (
    <span
      className={cls}
      style={{ width, height, borderRadius: radius ?? "0.45rem" }}
      aria-hidden
    />
  );
}

export function navIcon(item: SparkDashNavItem) {
  if (item.icon === "home") return <img src={SD_ASSETS.iconHome} alt="" />;
  if (item.icon === "explore") return <img src={SD_ASSETS.iconExplore} alt="" />;
  if (item.icon === "wallet") return <img src={SD_ASSETS.iconWallet} alt="" />;
  if (item.icon === "partner") return <img src={SD_ASSETS.iconPartner} alt="" />;
  if (item.icon === "bell") return <img src={SD_ASSETS.iconBell} alt="" />;
  if (item.icon === "settings") return <img src={SD_ASSETS.iconSettings} alt="" />;
  return (
    <span className={`sd-nav-glyph ${item.icon}`} aria-hidden>
      {item.icon === "receipt" ? <span className="chk" /> : null}
    </span>
  );
}

export function StatGlyph({ kind }: { kind: SparkDashStat["key"] }) {
  if (kind === "active") {
    return (
      <svg viewBox="0 0 20 20" fill="none" aria-hidden>
        <path
          d="M11.15 3.1 6.35 10.7h4.05l-1.15 6.2 5.15-8.55h-3.95l.7-5.25Z"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
      </svg>
    );
  }
  if (kind === "pending") {
    return (
      <svg viewBox="0 0 20 20" fill="none" aria-hidden>
        <circle cx="10" cy="10" r="6.15" stroke="currentColor" strokeWidth="1.5" />
        <path
          d="M10 6.55v3.85l2.65 1.55"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }
  if (kind === "month") {
    return (
      <svg viewBox="0 0 20 20" fill="none" aria-hidden>
        <path
          d="M3.7 13.35 7.55 9.4l2.55 2.2 6.1-6.05"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M12.55 5.55h3.65v3.65"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 20 20" fill="none" aria-hidden>
      <path
        d="M7.15 4.2h5.7v4.05c0 2.05-1.25 3.5-2.85 3.5s-2.85-1.45-2.85-3.5V4.2Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path
        d="M7.15 6.15H5.05c.1 1.85 1.15 3.05 2.25 3.3M12.85 6.15h2.1c-.1 1.85-1.15 3.05-2.25 3.3"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path
        d="M10 11.75v2.05M7.7 16.05h4.6M8.45 13.8h3.1"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function navHref(
  model: SparkDashHomeModel,
  hrefKey: SparkDashNavItem["key"] | undefined,
  fallback: string,
) {
  if (!hrefKey) return fallback;
  return model.nav.find((item) => item.key === hrefKey)?.href ?? fallback;
}
