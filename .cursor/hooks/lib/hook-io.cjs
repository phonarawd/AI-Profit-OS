/**
 * Cursor hook I/O — single stdin parser (CJS SSOT).
 * EMPTY → allow · NON-EMPTY malformed / policy / internal failure → deny.
 * UNKNOWN / BROKEN / INTERNAL != ALLOW.
 *
 * Stdin: wait for pipe end (or idle-complete JSON). Do not use
 * fs.readFileSync(0) on the live path — Windows can surface a partial
 * JSON prefix before the writer finishes, which used to become
 * HOOK_MALFORMED_INPUT false denies.
 */
"use strict";

const fs = require("fs");

/**
 * Live-path budget: wait for end, then one extend if JSON is truncated.
 * Low-spec dev machine (Celeron 2C/~8GB) can take several seconds just to
 * spawn `node` under load/AV-scan contention, so this budget must stay well
 * under hooks.json `timeout` (seconds) while tolerating a slow/loaded box —
 * a premature timeout here reads as a truncated/empty payload and fails
 * closed (deny) even though no real policy violation occurred.
 */
const STDIN_TIMEOUT_MS = 5000;
const STDIN_EXTEND_MS = 2500;

function stripBom(s) {
  return String(s || "").replace(/^\uFEFF/, "");
}

/** Sync fallback for crash-injection tests only. Live hooks use readStdinBuffered. */
function readStdinSync() {
  try {
    return stripBom(fs.readFileSync(0, "utf8"));
  } catch (_) {
    return "";
  }
}

function looksSettledJsonObject(raw) {
  const text = stripBom(raw).trim();
  if (!text || text[0] !== "{") return false;
  try {
    const v = JSON.parse(text);
    return !!(v && typeof v === "object" && !Array.isArray(v));
  } catch (_) {
    return false;
  }
}

function looksTruncatedJson(raw) {
  const text = stripBom(raw).trim();
  if (!text) return false;
  if (looksSettledJsonObject(text)) return false;
  return text[0] === "{" || text[0] === "[";
}

/**
 * Read hook stdin until pipe end, a settled JSON object, or timeout.
 * Empty after settle → caller treats as lifecycle ALLOW.
 * Truncated/malformed after settle → caller DENY (not fail-open).
 */
function readStdinBuffered(timeoutMs) {
  const ms = typeof timeoutMs === "number" ? timeoutMs : STDIN_TIMEOUT_MS;
  return new Promise(function (resolve) {
    let settled = false;
    let data = "";
    let ended = false;
    let idleTimer = null;

    function cleanup() {
      try {
        process.stdin.removeAllListeners("data");
        process.stdin.removeAllListeners("end");
        process.stdin.removeAllListeners("error");
        if (typeof process.stdin.pause === "function") process.stdin.pause();
      } catch (_) {}
      if (idleTimer) {
        try {
          clearTimeout(idleTimer);
        } catch (_) {}
        idleTimer = null;
      }
    }

    function done() {
      if (settled) return;
      settled = true;
      cleanup();
      resolve(stripBom(data));
    }

    try {
      process.stdin.setEncoding("utf8");
      process.stdin.on("data", function (chunk) {
        data += chunk;
        if (looksSettledJsonObject(data)) {
          done();
        }
      });
      process.stdin.on("end", function () {
        ended = true;
        done();
      });
      process.stdin.on("error", function () {
        done();
      });
      if (typeof process.stdin.resume === "function") process.stdin.resume();
    } catch (_) {
      done();
      return;
    }

    function onTimeout() {
      if (settled) return;
      if (ended || looksSettledJsonObject(data) || !String(data).trim()) {
        done();
        return;
      }
      if (looksTruncatedJson(data)) {
        idleTimer = setTimeout(done, STDIN_EXTEND_MS);
        return;
      }
      done();
    }

    idleTimer = setTimeout(onTimeout, ms);
  });
}

function parsePayloadResult(raw) {
  const text = stripBom(raw).trim();
  if (!text) return { ok: false, empty: true };
  try {
    const v = JSON.parse(text);
    if (v && typeof v === "object" && !Array.isArray(v)) {
      return { ok: true, payload: v };
    }
    return { ok: false, empty: false };
  } catch (_) {}
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start >= 0 && end > start) {
    try {
      const v = JSON.parse(text.slice(start, end + 1));
      if (v && typeof v === "object" && !Array.isArray(v)) {
        return { ok: true, payload: v };
      }
    } catch (_) {}
  }
  return { ok: false, empty: false };
}

function parsePayload(raw) {
  const r = parsePayloadResult(raw);
  return r.ok ? r.payload : null;
}

function allowResponse() {
  return { continue: true, permission: "allow" };
}

function denyResponse(code, userMessage, agentMessage) {
  const msg = userMessage || code || "Blocked: hook deny";
  return {
    continue: true,
    permission: "deny",
    code: code || "HOOK_DENY",
    user_message: msg,
    userMessage: msg,
    agent_message: agentMessage || msg,
    agentMessage: agentMessage || msg,
  };
}

function writeHookResponse(obj) {
  const x =
    obj && typeof obj === "object" && obj.permission
      ? obj
      : denyResponse(
          "HOOK_IO_INVALID_RESPONSE",
          "Blocked: invalid hook response.",
          "Hook response missing permission."
        );
  const line = JSON.stringify(x);
  try {
    fs.writeSync(1, line);
  } catch (_) {
    try {
      process.stdout.write(line);
    } catch (_) {}
  }
  return x;
}

function finishHook(obj) {
  writeHookResponse(obj);
  process.exit(0);
}

function finishAllow() {
  finishHook(allowResponse());
}

function finishDeny(code, userMessage, agentMessage) {
  finishHook(denyResponse(code, userMessage, agentMessage));
}

function logErr(kind, err) {
  try {
    const msg =
      err && err.message ? String(err.message) : err ? String(err) : "";
    fs.writeSync(
      2,
      "[project-boundary-hook] " + kind + (msg ? ": " + msg : "") + "\n"
    );
  } catch (_) {}
}

function installCrashGuards() {
  const safe = function (kind) {
    return function (err) {
      try {
        logErr(kind, err);
        finishDeny(
          kind,
          "Blocked: hook internal failure.",
          "Internal hook failure — deny (UNKNOWN POLICY STATE != ALLOW)."
        );
      } catch (_) {
        try {
          process.exit(1);
        } catch (_) {}
      }
    };
  };
  process.on("uncaughtException", safe("HOOK_UNCAUGHT"));
  process.on("unhandledRejection", safe("HOOK_UNHANDLED_REJECTION"));
}

function decideFromRaw(raw, decideFn) {
  if (!String(raw || "").trim()) {
    return allowResponse();
  }
  const parsed = parsePayloadResult(raw);
  if (!parsed.ok) {
    return denyResponse(
      "HOOK_MALFORMED_INPUT",
      "Blocked: malformed hook input.",
      "Non-empty stdin failed JSON parse — deny."
    );
  }
  let decision;
  try {
    decision = decideFn(parsed.payload);
  } catch (err) {
    logErr("HOOK_POLICY_EXCEPTION", err);
    return denyResponse(
      "HOOK_POLICY_EXCEPTION",
      "Blocked: policy evaluation failed.",
      "Policy evaluator threw — deny (BROKEN POLICY STATE != ALLOW)."
    );
  }
  if (
    decision &&
    typeof decision === "object" &&
    (decision.permission === "allow" || decision.permission === "deny")
  ) {
    return decision;
  }
  return denyResponse(
    "HOOK_INVALID_DECISION",
    "Blocked: invalid policy decision.",
    "Policy returned no allow/deny — deny."
  );
}

function runBoundaryHook(decideFn) {
  installCrashGuards();
  Promise.resolve()
    .then(function () {
      return readStdinBuffered();
    })
    .then(function (raw) {
      finishHook(decideFromRaw(raw, decideFn));
    })
    .catch(function (err) {
      logErr("HOOK_INTERNAL_EXCEPTION", err);
      finishDeny(
        "HOOK_INTERNAL_EXCEPTION",
        "Blocked: hook internal exception.",
        "Internal wrapper exception — deny (INTERNAL ERROR != ALLOW)."
      );
    });
}

module.exports = {
  STDIN_TIMEOUT_MS: STDIN_TIMEOUT_MS,
  STDIN_EXTEND_MS: STDIN_EXTEND_MS,
  stripBom: stripBom,
  readStdinSync: readStdinSync,
  readStdinBuffered: readStdinBuffered,
  looksSettledJsonObject: looksSettledJsonObject,
  looksTruncatedJson: looksTruncatedJson,
  parsePayload: parsePayload,
  parsePayloadResult: parsePayloadResult,
  decideFromRaw: decideFromRaw,
  writeHookResponse: writeHookResponse,
  finishHook: finishHook,
  finishAllow: finishAllow,
  finishDeny: finishDeny,
  allowResponse: allowResponse,
  denyResponse: denyResponse,
  installCrashGuards: installCrashGuards,
  runBoundaryHook: runBoundaryHook,
};
