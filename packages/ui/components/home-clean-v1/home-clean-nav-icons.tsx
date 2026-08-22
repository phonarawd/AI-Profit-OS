import type { HomeCleanNavIconId } from "./home-clean.types";

const ICON_BY_HREF = {
  "/": "home",
  "/profits": "profits",
  "/trades": "trades",
  "/wallet": "wallet",
  "/me": "me",
} as const satisfies Record<string, HomeCleanNavIconId>;

export function homeCleanNavIconIdFromHref(
  href: string,
): HomeCleanNavIconId | null {
  if (href in ICON_BY_HREF) {
    return ICON_BY_HREF[href as keyof typeof ICON_BY_HREF];
  }
  return null;
}

function Glyph({ d }: { d: string }) {
  return (
    <svg aria-hidden viewBox="0 0 24 24" width="24" height="24" fill="none">
      <path
        d={d}
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function HomeCleanNavIcon({ iconId }: { iconId: HomeCleanNavIconId }) {
  switch (iconId) {
    case "home":
      return <Glyph d="M5 11 12 5l7 6v8H5v-8Z" />;
    case "profits":
      return (
        <Glyph d="M12 4 13.5 9.5 19 11 13.5 12.5 12 18 10.5 12.5 5 11 10.5 9.5Z" />
      );
    case "trades":
      return <Glyph d="M5 16 10 11 13 14 19 8" />;
    case "wallet":
      return <Glyph d="M4 8h16v10H4V8Zm0 0 2-3h12l2 3" />;
    case "me":
      return (
        <Glyph d="M12 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM6 19c1.2-2.4 3.4-3.5 6-3.5s4.8 1.1 6 3.5" />
      );
  }
}
