import { luxFintech, type FontScaleKey } from "./lux-fintech";

export type { FontScaleKey };

export const FONT_SCALE_KEYS: FontScaleKey[] = ["md", "lg", "xl"];

/** Apply html[data-font-scale] — Light/system theme attrs never written */
export function applyFontScale(scale: FontScaleKey, el: HTMLElement = document.documentElement) {
  if (!FONT_SCALE_KEYS.includes(scale)) return;
  el.dataset.fontScale = scale;
  const tok = luxFintech.fontScale[scale];
  el.style.setProperty("--font-scale", String(tok.factor));
  el.style.setProperty("--line-height-boost", String(tok.lineHeightBoost));
  // theme lock
  delete el.dataset.theme;
  el.removeAttribute("data-theme");
}

export function fontScaleLabel(scale: FontScaleKey): string {
  const labels = { md: "보통", lg: "크게", xl: "더 크게" } as const;
  return labels[scale];
}
