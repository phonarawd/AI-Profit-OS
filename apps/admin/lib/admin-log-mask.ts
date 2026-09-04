/** Preview coerce — empty/missing stays null. Does not invent 0. */
function readPreviewText(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const text = value.trim();
  return text ? text : null;
}

const EMAIL_LIKE = new RegExp(
  "\\b[A-Za-z0-9._%+-]{1,64}" +
    String.fromCharCode(64) +
    "[A-Za-z0-9.-]{1,190}\\.[A-Za-z]{2,24}\\b",
  "g",
);

/** Admin log preview — resident/phone/token/email raw 0. Bounded replacements. */
export function maskLogPreview(value: unknown): string | null {
  const text = readPreviewText(value);
  if (!text) return null;
  return text
    .replace(/\b\d{6}-?\d{7}\b/g, "[숨김]")
    .replace(/\b01[016789]-?\d{3,4}-?\d{4}\b/g, "[숨김]")
    .replace(/\bBearer\s+\S+/gi, "Bearer [숨김]")
    .replace(/\bsk-[A-Za-z0-9]{8,}\b/g, "[숨김]")
    .replace(
      /\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/g,
      "[숨김]",
    )
    .replace(EMAIL_LIKE, "[숨김]");
}
