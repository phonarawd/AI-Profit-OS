/**
 * Shared Cursor hook I/O — re-export of hook-io.cjs (single parser SSOT).
 * EMPTY → allow · NON-EMPTY malformed → deny · policy/internal fail → deny.
 */
import io from "./hook-io.cjs";

export const STDIN_TIMEOUT_MS = io.STDIN_TIMEOUT_MS;
export const STDIN_EXTEND_MS = io.STDIN_EXTEND_MS;
export const stripBom = io.stripBom;
export const readStdinSync = io.readStdinSync;
export const readStdinBuffered = io.readStdinBuffered;
export const looksSettledJsonObject = io.looksSettledJsonObject;
export const looksTruncatedJson = io.looksTruncatedJson;
export const parsePayload = io.parsePayload;
export const parsePayloadResult = io.parsePayloadResult;
export const decideFromRaw = io.decideFromRaw;
export const allowResponse = io.allowResponse;
export const denyResponse = io.denyResponse;
export const writeHookResponse = io.writeHookResponse;
export const finishHook = io.finishHook;
export const finishAllow = io.finishAllow;
export const finishDeny = io.finishDeny;
export const installCrashGuards = io.installCrashGuards;
export const runBoundaryHook = io.runBoundaryHook;
