/**
 * REL-018 에셋 파이프라인 정책.
 * 파트너 로고 = official-only. AI 생성 하드페일. Home 잠금 경로 쓰기 거부.
 */
const path = require("path");

const CLASSES = Object.freeze([
  "ui_icon",
  "product_media",
  "partner_logo",
  "brand",
  "raster",
]);

const SOURCE_KINDS = Object.freeze([
  "official",
  "figma_export",
  "local_file",
  "capture",
]);

const FORBIDDEN_AI_SOURCE_KINDS = Object.freeze([
  "ai_generated",
  "dalle",
  "midjourney",
  "flux",
  "stable_diffusion",
  "chatgpt_image",
  "generated",
]);

const FORBIDDEN_AI_MARKERS = Object.freeze([
  "openai.com",
  "api.openai.com",
  "dall-e",
  "dalle",
  "midjourney",
  "stability.ai",
  "stable-diffusion",
  "flux.1",
  "chatgpt.com/images",
  "gemini.*image",
  "ai-generated",
  "ai_generated",
]);

const PARTNER_ALLOWED_SOURCE_KINDS = Object.freeze(["official"]);

const EMOJI_RE = /\p{Extended_Pictographic}/u;

const HOME_LOCK_PREFIXES = Object.freeze([
  "apps/web/public/spark-dash/",
  "apps/web/components/spark-dash-home/",
]);

function normalizeRel(rel) {
  return String(rel || "").replace(/\\/g, "/").replace(/^\.\//, "");
}

function haystack(req) {
  return JSON.stringify(req || {}).toLowerCase();
}

function isHomeLockedPath(destRel) {
  const rel = normalizeRel(destRel);
  return HOME_LOCK_PREFIXES.some((p) => rel === p.slice(0, -1) || rel.startsWith(p));
}

function findAiMarker(req) {
  const hay = haystack(req);
  for (const marker of FORBIDDEN_AI_MARKERS) {
    if (hay.includes(marker)) return marker;
  }
  const kind = String(req?.source?.kind || "").toLowerCase();
  if (FORBIDDEN_AI_SOURCE_KINDS.includes(kind)) return kind;
  return "";
}

function validateRequest(req) {
  const fails = [];
  if (!req || typeof req !== "object") {
    return ["request JSON required"];
  }
  if (!req.id) fails.push("id required");
  if (!CLASSES.includes(req.class)) {
    fails.push(`class must be one of ${CLASSES.join("|")}`);
  }
  const kind = req.source && req.source.kind;
  if (!kind) fails.push("source.kind required");
  if (kind && FORBIDDEN_AI_SOURCE_KINDS.includes(kind)) {
    fails.push(`AI source kind forbidden: ${kind}`);
  }
  if (kind && !SOURCE_KINDS.includes(kind) && !FORBIDDEN_AI_SOURCE_KINDS.includes(kind)) {
    fails.push(`unknown source.kind: ${kind}`);
  }
  const destRel = normalizeRel(req.destRel);
  if (!destRel) fails.push("destRel required");

  const ai = findAiMarker(req);
  if (req.class === "partner_logo") {
    if (kind && !PARTNER_ALLOWED_SOURCE_KINDS.includes(kind)) {
      fails.push("partner_logo source.kind must be official");
    }
    if (ai) fails.push(`partner_logo AI path hard-fail: ${ai}`);
    if (req.source && req.source.generator) {
      fails.push("partner_logo generator field forbidden (official-only)");
    }
  } else if (ai) {
    fails.push(`AI generation path forbidden: ${ai}`);
  }

  const emojiHay = [
    req.source && req.source.emoji,
    req.source && req.source.glyph,
    req.replaceWithEmoji,
  ]
    .filter(Boolean)
    .join("");
  if (req.source && req.source.kind === "emoji") {
    fails.push("emoji-as-icon source forbidden");
  }
  if (emojiHay && EMOJI_RE.test(emojiHay)) {
    fails.push("emoji-as-icon replacement forbidden");
  }

  if (destRel && isHomeLockedPath(destRel)) {
    fails.push(`Home locked dest refused: ${destRel}`);
  }

  return fails;
}

function resolveSourcePath(req, repoRoot) {
  const src = req.source || {};
  if (src.path) {
    const rel = normalizeRel(src.path);
    if (path.isAbsolute(src.path)) return src.path;
    return path.join(repoRoot, rel);
  }
  return "";
}

module.exports = {
  CLASSES,
  SOURCE_KINDS,
  FORBIDDEN_AI_SOURCE_KINDS,
  FORBIDDEN_AI_MARKERS,
  PARTNER_ALLOWED_SOURCE_KINDS,
  HOME_LOCK_PREFIXES,
  EMOJI_RE,
  normalizeRel,
  isHomeLockedPath,
  findAiMarker,
  validateRequest,
  resolveSourcePath,
};
