/**
 * HomeCleanV1 code-native 소형 UI 아이콘.
 * HOME_CLEAN_CODE_NATIVE_UI_ICON_APPROVED
 * Logo·Robot·Product 대체 0. 전역 디자인 시스템 변경 0. 신규 raster 0.
 */

function Glyph({
  d,
  size = 20,
}: {
  d: string;
  size?: number;
}) {
  return (
    <svg aria-hidden viewBox="0 0 24 24" width={size} height={size} fill="none">
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

export function HomeCleanBellIcon() {
  return (
    <svg aria-hidden viewBox="0 0 24 24" width="20" height="20" fill="none">
      <path
        d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      <path
        d="M10.3 21a1.94 1.94 0 0 0 3.4 0"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function HomeCleanChevronIcon() {
  return <Glyph d="M8 10l4 4 4-4" size={16} />;
}

export function HomeCleanRailProgressIcon() {
  return <Glyph d="M12 7v5l3 2M12 4a8 8 0 1 1 0 16 8 8 0 0 1 0-16Z" />;
}

export function HomeCleanRailUpdateIcon() {
  return <Glyph d="M4 10v4h3l6 4V6L7 10H4Zm13.2-1.2a3.2 3.2 0 0 1 0 6.4" />;
}

export function HomeCleanRailTrustIcon() {
  return <Glyph d="M12 3 5 6v6c0 4.2 2.8 7.2 7 8.5 4.2-1.3 7-4.3 7-8.5V6l-7-3Z" />;
}

export function HomeCleanRailInsightIcon() {
  return <Glyph d="M5 17V11M10 17V7M15 17v-4M20 17V9" />;
}

/** 장식/로딩용. 실데이터·축 숫자·기간 0 */
export function HomeCleanTrendLine() {
  return (
    <svg
      aria-hidden
      viewBox="0 0 280 156"
      width="100%"
      height="156"
      fill="none"
      preserveAspectRatio="none"
    >
      <defs>
        <linearGradient id="hcAssetTrendFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="currentColor" stopOpacity="0.32" />
          <stop offset="100%" stopColor="currentColor" stopOpacity="0.02" />
        </linearGradient>
      </defs>
      <path
        d="M0 124C36 120 52 86 86 90C122 95 136 58 176 64C214 70 232 38 280 42V156H0V124Z"
        fill="url(#hcAssetTrendFill)"
      />
      <path
        d="M0 124C36 120 52 86 86 90C122 95 136 58 176 64C214 70 232 38 280 42"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
