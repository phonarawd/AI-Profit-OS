"use strict";
function readStdin(timeoutMs) {
  const ms = typeof timeoutMs === "number" ? timeoutMs : 400;
  return new Promise((resolve) => {
    let settled = false;
    let data = "";
    function done(value) {
      if (settled) return;
      settled = true;
      try {
        process.stdin.removeAllListeners("data");
        process.stdin.removeAllListeners("end");
        process.stdin.removeAllListeners("error");
        if (typeof process.stdin.pause === "function") process.stdin.pause();
      } catch (_) {}
      resolve(String(value || "").replace(/^\uFEFF/, ""));
    }
    try { if (process.stdin.isTTY) { done(""); return; } } catch (_) {}
    try {
      process.stdin.setEncoding("utf8");
      process.stdin.on("data", (chunk) => {
        data += chunk;
        const t = data.replace(/^\uFEFF/, "").trim();
        if (t[0] === "{" && t[t.length - 1] === "}") {
          try { JSON.parse(t); done(data); } catch (_) {}
        }
      });
      process.stdin.on("end", () => done(data));
      process.stdin.on("error", () => done(data));
      if (typeof process.stdin.resume === "function") process.stdin.resume();
    } catch (_) { done(""); return; }
    setTimeout(() => done(data), ms);
  });
}
function parsePayload(raw) {
  const text = String(raw || "").replace(/^\uFEFF/, "").trim();
  if (!text) return {};
  try { return JSON.parse(text); } catch (_) {}
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start >= 0 && end > start) {
    try { return JSON.parse(text.slice(start, end + 1)); } catch (_) {}
  }
  return {};
}
module.exports = { readStdin, parsePayload };
