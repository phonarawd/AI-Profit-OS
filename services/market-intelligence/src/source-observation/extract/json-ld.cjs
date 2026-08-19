/**
 * HTML에서 공개 JSON-LD 블록을 읽는다. 특정 source 값을 하드코딩하지 않는다.
 */

function extractLdJsonBlocks(html) {
  if (typeof html !== "string" || html.trim() === "") {
    return { ok: false, reason: "empty_document" };
  }
  const blocks = [];
  const re = /<script\b[^>]*type\s*=\s*["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let m;
  while ((m = re.exec(html))) {
    const raw = String(m[1] || "").trim();
    if (!raw) continue;
    try {
      blocks.push(JSON.parse(raw));
    } catch {
      return { ok: false, reason: "malformed_jsonld" };
    }
  }
  return { ok: true, blocks };
}

function flattenLd(node, out = []) {
  if (node == null) return out;
  if (Array.isArray(node)) {
    for (const item of node) flattenLd(item, out);
    return out;
  }
  if (typeof node !== "object") return out;
  if (Object.prototype.hasOwnProperty.call(node, "@graph")) {
    flattenLd(node["@graph"], out);
  }
  out.push(node);
  return out;
}

function nodeTypes(node) {
  const t = node && node["@type"];
  if (t == null) return [];
  return Array.isArray(t) ? t.map(String) : [String(t)];
}

function isType(node, type) {
  return nodeTypes(node).includes(type);
}

function collectProducts(blocks) {
  const products = [];
  for (const block of blocks) {
    for (const node of flattenLd(block)) {
      if (isType(node, "Product")) products.push(node);
    }
  }
  return products;
}

module.exports = {
  extractLdJsonBlocks,
  flattenLd,
  isType,
  collectProducts,
};
