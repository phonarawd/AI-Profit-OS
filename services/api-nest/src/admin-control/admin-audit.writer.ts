/**
 * Zero-dep seam so AdminGuard can write deny audit without constructor DI.
 */

import type { AdminAuditWriteInput } from "./admin-audit.service";

type Writer = (input: AdminAuditWriteInput) => void;

let writer: Writer | null = null;

export function registerAdminAuditWriter(fn: Writer): void {
  writer = fn;
}

export function writeAdminAuditDeny(input: AdminAuditWriteInput): void {
  if (!writer) return;
  writer({ ...input, outcome: "denied" });
}
