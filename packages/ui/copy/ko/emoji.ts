/**
 * §27.10.3 cute emoji palette SSOT — user surfaces only.
 * Admin = §27.5 (cute tone forbidden). Disclaimer/legal body = emoji 0.
 */

export const CUTE_EMOJI_ALLOWED = [
  "✨",
  "😊",
  "🙌",
  "💡",
  "🪙",
  "💰",
  "💸",
  "🎉",
  "🛡️",
  "🔐",
  "📡",
  "🤖",
  "🎁",
  "✅",
  "👋",
  "💙",
  "🌟",
  "📱",
  "🤝",
  "📝",
  "⏱️",
  "🏠",
  "⭐",
  "⏳",
  "😔",
  "👀",
  "📤",
  "🔄",
  "🐢",
  "⏰",
  "⏸️",
  "🚫",
  "↩️",
  "📊",
  "📭",
  "✋",
  "📢",
  "🔑",
  "🎫",
  "😅",
  "🙏",
  "🛑",
  "🔤",
  "🔴",
] as const;

/** §27.10.3 forbidden — casino / FOMO / gendered / excess */
export const CUTE_EMOJI_FORBIDDEN = [
  "🎰",
  "🃏",
  "🎲",
  "🔞",
  "💀",
] as const;

/** Surface caps (§27.10.2) — verify:cute-emoji-palette */
export const EMOJI_CAPS = {
  toastMin: 1,
  toastMax: 2,
  emptyRequired: 1,
  hintMax: 1,
  guideTitleMax: 1,
  guideBodyPerCardMax: 2,
  peotteokPerSentenceMax: 2,
  disclaimerBodyMax: 0,
  primaryCtaMax: 0,
  adminMax: 1,
} as const;

export type CuteEmojiAllowed = (typeof CUTE_EMOJI_ALLOWED)[number];
