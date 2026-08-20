#!/usr/bin/env node
/**
 * REL-020 — VAPID 키 생성 경로.
 * 비밀은 .env / CF Workers Secrets 에만 둔다. Git 커밋 금지.
 *
 *   node tooling/pwa/generate-vapid.mjs --selftest
 *   node tooling/pwa/generate-vapid.mjs --write-local   # .env.local only
 */
import { generateKeyPairSync } from "node:crypto";
import { writeFileSync, existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

function b64url(buf) {
  return Buffer.from(buf).toString("base64url");
}

export function generateVapidKeys() {
  const { publicKey, privateKey } = generateKeyPairSync("ec", {
    namedCurve: "prime256v1",
  });
  const pubJwk = publicKey.export({ format: "jwk" });
  const privJwk = privateKey.export({ format: "jwk" });
  const x = Buffer.from(pubJwk.x, "base64url");
  const y = Buffer.from(pubJwk.y, "base64url");
  const d = Buffer.from(privJwk.d, "base64url");
  return {
    publicKey: b64url(Buffer.concat([Buffer.from([0x04]), x, y])),
    privateKey: b64url(d),
  };
}

function printHelp() {
  console.log(`VAPID 키를 로컬에서 만든다. GitHub/레포에 넣지 않는다.

사용:
  node tooling/pwa/generate-vapid.mjs --selftest
  node tooling/pwa/generate-vapid.mjs --write-local

CF Workers Secrets (deploy는 REL-701/사람 게이트 전 금지):
  wrangler secret put VAPID_PUBLIC_KEY --config workers/push-dispatcher/wrangler.toml
  wrangler secret put VAPID_PRIVATE_KEY --config workers/push-dispatcher/wrangler.toml
  wrangler secret put PUSH_DISPATCH_TOKEN --config workers/push-dispatcher/wrangler.toml

공개키만 웹에 노출:
  NEXT_PUBLIC_VAPID_PUBLIC_KEY=<public>
`);
}

function selftest() {
  const keys = generateVapidKeys();
  const pub = Buffer.from(keys.publicKey, "base64url");
  const priv = Buffer.from(keys.privateKey, "base64url");
  if (pub.length !== 65 || pub[0] !== 0x04) {
    throw new Error("VAPID public key must be uncompressed P-256");
  }
  if (priv.length !== 32) {
    throw new Error("VAPID private key must be 32 bytes");
  }
  console.log("[generate-vapid] SELFTEST PASS (keys not written)");
}

function writeLocal() {
  const root = resolve(process.cwd());
  const dest = resolve(root, ".env.local");
  const keys = generateVapidKeys();
  const block = [
    "",
    "# REL-020 VAPID — generated locally · do not commit",
    `VAPID_PUBLIC_KEY=${keys.publicKey}`,
    `VAPID_PRIVATE_KEY=${keys.privateKey}`,
    "VAPID_SUBJECT=mailto:ops@localhost",
    `NEXT_PUBLIC_VAPID_PUBLIC_KEY=${keys.publicKey}`,
    "PUSH_ENABLED=true",
    "",
  ].join("\n");
  if (existsSync(dest)) {
    const prev = readFileSync(dest, "utf8");
    if (prev.includes("VAPID_PRIVATE_KEY=")) {
      console.error(".env.local already has VAPID_PRIVATE_KEY — refuse overwrite");
      process.exit(2);
    }
    writeFileSync(dest, `${prev.trimEnd()}\n${block}`);
  } else {
    writeFileSync(dest, `${block.trimStart()}\n`);
  }
  console.log("wrote VAPID keys to .env.local (gitignored)");
}

const args = process.argv.slice(2);
if (args.includes("--help") || args.includes("-h") || args.length === 0) {
  printHelp();
  process.exit(0);
}
if (args.includes("--selftest")) {
  selftest();
  process.exit(0);
}
if (args.includes("--write-local")) {
  writeLocal();
  process.exit(0);
}
printHelp();
process.exit(1);
