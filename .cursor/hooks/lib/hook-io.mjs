/**
 * Shared Cursor hook I/O contract (ESM).
 * - stdin once, UTF-8 BOM strip, parse never throws
 * - sync stdout (fs.writeSync) — avoid Windows buffered write+exit race
 * - EMPTY → allow (harmless lifecycle / self-lock prevention)
 * - NON-EMPTY malformed → deny
 * - policy / internal / uncaught failure → deny (UNKNOWN != ALLOW)
 * - Decision via permission field; policy decisions exit 0
 */
import fs from "node:fs";

export function stripBom(s) {
  return String(s || "").replace(/^\uFEFF/, "");
}

/** Read stdin once (fd 0). Never throws. */
export function readStdinSync() {
  try {
    return stripBom(fs.readFileSync(0, "utf8"));
  } catch {
    return "";
  }
}

/**
 * Parse hook JSON.
 * @returns {{ ok: true, payload: object } | { ok: false, empty: boolean }}
 */
export function parsePayloadResult(raw) {
  const text = stripBom(raw).trim();
  if (!text) return { ok: false, empty: true };
  try {
    const v = JSON.parse(text);
    if (v && typeof v === "object") return { ok: true, payload: v };
    return { ok: false, empty: false };
  } catch {
    /* fall through */
  }
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start >= 0 && end > start) {
    try {
      const v = JSON.parse(text.slice(start, end + 1));
      if (v && typeof v === "object") return { ok: true, payload: v };
    } catch {
      /* malformed */
    }
  }
  return { ok: false, empty: false };
}

/** @deprecated prefer parsePayloadResult — empty/malformed both null historically */
export function parsePayload(raw) {
  const r = parsePayloadResult(raw);
  return r.ok ? r.payload : null;
}

export function allowResponse() {
  return { continue: true, permission: "allow" };
}

export function denyResponse(code, userMessage, agentMessage) {
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

export function writeHookResponse(obj) {
  // Missing/invalid response object → deny (never invent ALLOW)
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
  } catch {
    try {
      process.stdout.write(line);
    } catch {
      /* ignore */
    }
  }
  return x;
}

export function finishHook(obj) {
  writeHookResponse(obj);
  process.exit(0);
}

export function finishAllow() {
  finishHook(allowResponse());
}

export function finishDeny(code, userMessage, agentMessage) {
  finishHook(denyResponse(code, userMessage, agentMessage));
}

function logErr(kind, err) {
  try {
    const msg =
      err && err.message
        ? String(err.message)
        : err
          ? String(err)
          : "";
    fs.writeSync(2, "[project-boundary-hook] " + kind + (msg ? ": " + msg : "") + "\n");
  } catch {
    /* ignore */
  }
}

/** Crash / rejection → DENY + exit 0; if stdout fail → exit 1 (failClosed). */
export function installCrashGuards() {
  const safe = (kind) => (err) => {
    try {
      logErr(kind, err);
      finishDeny(
        kind,
        "Blocked: hook internal failure.",
        "Internal hook failure — deny (UNKNOWN POLICY STATE != ALLOW)."
      );
    } catch {
      try {
        process.exit(1);
      } catch {
        /* ignore */
      }
    }
  };
  process.on("uncaughtException", safe("HOOK_UNCAUGHT"));
  process.on("unhandledRejection", safe("HOOK_UNHANDLED_REJECTION"));
}

/**
 * Standard boundary-hook main: read → parse → decide → finish.
 * @param {(payload: object) => object} decideFn
 */
export function runBoundaryHook(decideFn) {
  installCrashGuards();
  try {
    const raw = readStdinSync();
    if (!String(raw || "").trim()) {
      // EMPTY = harmless lifecycle → ALLOW (self-lock prevention)
      finishAllow();
    }
    const parsed = parsePayloadResult(raw);
    if (!parsed.ok) {
      // NON-EMPTY malformed → DENY
      finishDeny(
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
      finishDeny(
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
      finishHook(decision);
    }
    // Unsupported / invalid decision shape → DENY (not ALLOW)
    finishDeny(
      "HOOK_INVALID_DECISION",
      "Blocked: invalid policy decision.",
      "Policy returned no allow/deny — deny."
    );
  } catch (err) {
    logErr("HOOK_INTERNAL_EXCEPTION", err);
    finishDeny(
      "HOOK_INTERNAL_EXCEPTION",
      "Blocked: hook internal exception.",
      "Internal wrapper exception — deny (INTERNAL ERROR != ALLOW)."
    );
  }
}
