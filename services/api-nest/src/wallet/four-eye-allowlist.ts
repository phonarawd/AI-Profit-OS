/**
 * Local four-eye allowlist for Tatum KMS.
 * Writes pending tx ids so daemon --external-url can approve signing.
 * Never logs secret values / mnemonics.
 */

import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";

export type FourEyeAllowlist = { ids: string[] };

function kmsHome(): string {
  return (
    process.env.AIPO_TRON_KMS_HOME?.trim() ||
    join(homedir(), "AppData", "Local", "AI-Profit-OS", "tatum-kms")
  );
}

export function fourEyeAllowlistPath(): string {
  return join(kmsHome(), "four-eye-allowlist.json");
}

export function readFourEyeAllowlist(): FourEyeAllowlist {
  const p = fourEyeAllowlistPath();
  if (!existsSync(p)) return { ids: [] };
  try {
    const j = JSON.parse(readFileSync(p, "utf8")) as { ids?: unknown };
    const ids = Array.isArray(j.ids)
      ? j.ids.map(String).filter((x) => x.length > 0)
      : [];
    return { ids };
  } catch {
    return { ids: [] };
  }
}

/** Idempotent append. Caps size to avoid unbounded growth. */
export function allowFourEyeTxId(txId: string): void {
  const id = String(txId || "").trim();
  if (!id) return;
  const p = fourEyeAllowlistPath();
  mkdirSync(kmsHome(), { recursive: true });
  const cur = readFourEyeAllowlist();
  if (cur.ids.includes(id)) return;
  const next = [...cur.ids, id].slice(-5_000);
  writeFileSync(p, JSON.stringify({ ids: next }, null, 2), {
    encoding: "utf8",
    mode: 0o600,
  });
}
