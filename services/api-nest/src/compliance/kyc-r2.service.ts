/**
 * Money §42.2.1 — Cloudflare R2 kyc-docs (server-side only).
 * Object key: kyc/{userId}/{submissionId}/{hash}.enc
 * Admin signed URL TTL ≤5m · public ACL 0 · apps/web direct URL 0.
 */

import {
  BadRequestException,
  Injectable,
  ServiceUnavailableException,
} from "@nestjs/common";
import { createCipheriv, createHash, createHmac, randomBytes } from "node:crypto";
import { loadPhase0Env } from "../config/phase0.env";
import {
  KYC_SIGNED_URL_TTL_SEC,
  type KycDocSignedUrl,
} from "./compliance.types";

type R2Creds = {
  accountId: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucket: string;
  encryptionKey: Buffer | null;
};

@Injectable()
export class KycR2Service {
  private creds(): R2Creds {
    const env = loadPhase0Env();
    return {
      accountId: env.r2AccountId ?? "",
      accessKeyId: env.r2AccessKeyId ?? "",
      secretAccessKey: env.r2SecretAccessKey ?? "",
      bucket: env.r2KycBucket || "kyc-docs",
      encryptionKey: env.r2KycEncryptionKey
        ? createHash("sha256").update(env.r2KycEncryptionKey).digest()
        : null,
    };
  }

  configured(): boolean {
    const c = this.creds();
    return Boolean(c.accountId && c.accessKeyId && c.secretAccessKey);
  }

  /** Bucket lock — verify:kyc-r2-only / phase0-bootstrap */
  bucketName(): string {
    return this.creds().bucket || "kyc-docs";
  }

  buildObjectKey(input: {
    userId: string;
    submissionId: string;
    bytes: Buffer;
    kind: "id" | "selfie";
  }): string {
    const hash = createHash("sha256")
      .update(input.bytes)
      .update(input.kind)
      .digest("hex")
      .slice(0, 32);
    return `kyc/${input.userId}/${input.submissionId}/${hash}.enc`;
  }

  assertPrivateKey(key: string): void {
    if (!key.startsWith("kyc/")) {
      throw new BadRequestException("idDocR2Key must start with kyc/");
    }
    if (key.includes("://") || key.includes("r2.dev") || key.includes("http")) {
      throw new BadRequestException("R2 public URL forbidden — store object key only");
    }
  }

  /** Encrypt at-rest (AES-256-GCM) when encryption key present · else wrap with random IV prefix. */
  seal(bytes: Buffer): Buffer {
    const key = this.creds().encryptionKey;
    if (!key) {
      const iv = randomBytes(12);
      return Buffer.concat([Buffer.from("raw1"), iv, bytes]);
    }
    const iv = randomBytes(12);
    const cipher = createCipheriv("aes-256-gcm", key, iv);
    const enc = Buffer.concat([cipher.update(bytes), cipher.final()]);
    const tag = cipher.getAuthTag();
    return Buffer.concat([Buffer.from("gcm1"), iv, tag, enc]);
  }

  async putObject(key: string, sealed: Buffer, contentType = "application/octet-stream"): Promise<void> {
    this.assertPrivateKey(key);
    const c = this.creds();
    if (!this.configured()) {
      // Phase0 local/CI without R2 creds — metadata path still records key; put is deferred.
      return;
    }
    const host = `${c.accountId}.r2.cloudflarestorage.com`;
    const url = `https://${host}/${c.bucket}/${key.split("/").map(encodeURIComponent).join("/")}`;
    const amzDate = this.amzDate();
    const dateStamp = amzDate.slice(0, 8);
    const payloadHash = createHash("sha256").update(sealed).digest("hex");
    const headers: Record<string, string> = {
      Host: host,
      "Content-Type": contentType,
      "Content-Length": String(sealed.length),
      "x-amz-content-sha256": payloadHash,
      "x-amz-date": amzDate,
    };
    headers.Authorization = this.signV4({
      method: "PUT",
      host,
      path: `/${c.bucket}/${key}`,
      query: "",
      headers,
      payloadHash,
      dateStamp,
      amzDate,
      accessKeyId: c.accessKeyId,
      secretAccessKey: c.secretAccessKey,
    });

    const res = await fetch(url, {
      method: "PUT",
      headers,
      body: new Uint8Array(sealed),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new ServiceUnavailableException(
        `R2 put failed ${res.status}: ${body.slice(0, 200)}`,
      );
    }
  }

  /** Admin compliance·최고 only · TTL ≤5m · never return public URL */
  signedGetUrl(key: string, expiresInSec = KYC_SIGNED_URL_TTL_SEC): KycDocSignedUrl["signedUrl"] {
    this.assertPrivateKey(key);
    const ttl = Math.min(Math.max(1, expiresInSec), KYC_SIGNED_URL_TTL_SEC);
    const c = this.creds();
    if (!this.configured()) {
      throw new ServiceUnavailableException(
        "R2 credentials unset — cannot mint signed URL",
      );
    }
    const host = `${c.accountId}.r2.cloudflarestorage.com`;
    const amzDate = this.amzDate();
    const dateStamp = amzDate.slice(0, 8);
    const credential = `${c.accessKeyId}/${dateStamp}/auto/s3/aws4_request`;
    const queryPairs: Array<[string, string]> = [
      ["X-Amz-Algorithm", "AWS4-HMAC-SHA256"],
      ["X-Amz-Credential", credential],
      ["X-Amz-Date", amzDate],
      ["X-Amz-Expires", String(ttl)],
      ["X-Amz-SignedHeaders", "host"],
    ];
    queryPairs.sort((a, b) => a[0].localeCompare(b[0]));
    const canonicalQuery = queryPairs
      .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
      .join("&");
    const canonicalHeaders = `host:${host}\n`;
    const canonicalRequest = [
      "GET",
      `/${c.bucket}/${key}`,
      canonicalQuery,
      canonicalHeaders,
      "host",
      "UNSIGNED-PAYLOAD",
    ].join("\n");
    const stringToSign = [
      "AWS4-HMAC-SHA256",
      amzDate,
      `${dateStamp}/auto/s3/aws4_request`,
      createHash("sha256").update(canonicalRequest).digest("hex"),
    ].join("\n");
    const signingKey = this.signingKey(c.secretAccessKey, dateStamp);
    const signature = createHmac("sha256", signingKey)
      .update(stringToSign)
      .digest("hex");
    return `https://${host}/${c.bucket}/${key.split("/").map(encodeURIComponent).join("/")}?${canonicalQuery}&X-Amz-Signature=${signature}`;
  }

  private amzDate(): string {
    return new Date()
      .toISOString()
      .replace(/[-:]/g, "")
      .replace(/\.\d{3}Z$/, "Z");
  }

  private signingKey(secret: string, dateStamp: string): Buffer {
    const kDate = createHmac("sha256", `AWS4${secret}`).update(dateStamp).digest();
    const kRegion = createHmac("sha256", kDate).update("auto").digest();
    const kService = createHmac("sha256", kRegion).update("s3").digest();
    return createHmac("sha256", kService).update("aws4_request").digest();
  }

  private signV4(input: {
    method: string;
    host: string;
    path: string;
    query: string;
    headers: Record<string, string>;
    payloadHash: string;
    dateStamp: string;
    amzDate: string;
    accessKeyId: string;
    secretAccessKey: string;
  }): string {
    const signedHeaders = "content-type;host;x-amz-content-sha256;x-amz-date";
    const canonicalHeaders =
      `content-type:${input.headers["Content-Type"]}\n` +
      `host:${input.host}\n` +
      `x-amz-content-sha256:${input.payloadHash}\n` +
      `x-amz-date:${input.amzDate}\n`;
    const canonicalRequest = [
      input.method,
      input.path,
      input.query,
      canonicalHeaders,
      signedHeaders,
      input.payloadHash,
    ].join("\n");
    const stringToSign = [
      "AWS4-HMAC-SHA256",
      input.amzDate,
      `${input.dateStamp}/auto/s3/aws4_request`,
      createHash("sha256").update(canonicalRequest).digest("hex"),
    ].join("\n");
    const signature = createHmac(
      "sha256",
      this.signingKey(input.secretAccessKey, input.dateStamp),
    )
      .update(stringToSign)
      .digest("hex");
    return (
      `AWS4-HMAC-SHA256 Credential=${input.accessKeyId}/${input.dateStamp}/auto/s3/aws4_request, ` +
      `SignedHeaders=${signedHeaders}, Signature=${signature}`
    );
  }
}
