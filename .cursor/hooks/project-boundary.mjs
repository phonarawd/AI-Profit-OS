#!/usr/bin/env node
/**
 * Unified project-boundary hook — stdin JSON → allow|deny.
 * Empty / non-JSON → allow (failClosed lock prevention).
 * Always process.exit(0); block via permission:deny only.
 */
import fs from "node:fs";
import { decideFromPayload } from "./lib/project-boundary-policy.mjs";

function writeResponse(obj) {
  const x =
    obj && typeof obj === "object" && obj.permission
      ? obj
      : { continue: true, permission: "allow" };
  try {
    fs.writeSync(1, JSON.stringify(x));
  } catch {
    try {
      process.stdout.write(JSON.stringify(x));
    } catch {
      /* ignore */
    }
  }
}

function finish(obj) {
  writeResponse(obj);
  process.exit(0);
}

process.on("uncaughtException", () => {
  finish({ continue: true, permission: "allow" });
});
process.on("unhandledRejection", () => {
  finish({ continue: true, permission: "allow" });
});

try {
  let raw = "";
  try {
    raw = fs.readFileSync(0, "utf8");
  } catch {
    raw = "";
  }
  raw = String(raw || "").replace(/^\uFEFF/, "");

  if (!raw.trim()) {
    finish({ continue: true, permission: "allow" });
  }

  let payload = null;
  try {
    payload = JSON.parse(raw.trim());
  } catch {
    const start = raw.indexOf("{");
    const end = raw.lastIndexOf("}");
    if (start >= 0 && end > start) {
      try {
        payload = JSON.parse(raw.slice(start, end + 1));
      } catch {
        payload = null;
      }
    }
  }

  if (!payload || typeof payload !== "object") {
    finish({ continue: true, permission: "allow" });
  }

  finish(decideFromPayload(payload));
} catch {
  finish({ continue: true, permission: "allow" });
}
