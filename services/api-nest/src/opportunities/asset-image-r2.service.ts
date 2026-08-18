/**
 * Engine §0.0.6 — Cloudflare R2 public asset-images bucket.
 * Admin uploads → public HTTPS URL → Asset Master imageSource=admin_r2.
 * Distinct from private kyc-docs (Money §42).
 */

import { BadRequestException, Injectable } from "@nestjs/common";
import { createHash, createHmac, randomBytes } from "node:crypto";
import { loadPhase0Env } from "../config/phase0.env";

const ALLOWED_EXT = new Set(["jpg", "jpeg", "png", "webp", "gif"]);

@Injectable()
export class AssetImageR2Service {
  bucketName(): string {
    return loadPhase0Env().r2AssetImagesBucket || "asset-images";
  }

  configured(): boolean {
    const env = loadPhase0Env();
    return Boolean(
      env.r2AccountId && env.r2AccessKeyId && env.r2SecretAccessKey,
    );
  }

  /**
   * Object key lock: assets/{category}/{assetId}.{ext}
   */
  buildObjectKey(input: {
    assetId: string;
    category: "watch" | "trading_card" | "luxury_bag";
    contentType?: string;
    ext?: string;
  }): string {
    const assetId = String(input.assetId ?? "")
      .trim()
      .replace(/[^a-zA-Z0-9._-]/g, "_");
    if (!assetId) throw new BadRequestException("assetId required");
    const ext = this.normalizeExt(input.ext, input.contentType);
    return `assets/${input.category}/${assetId}.${ext}`;
  }

  /**
   * Public URL for OpportunityCard.assetImageUrl (시세 참고용).
   * Prefer R2_ASSET_IMAGES_PUBLIC_BASE; else r2.dev placeholder shape.
   */
  buildPublicUrl(objectKey: string): string {
    this.assertAssetKey(objectKey);
    const env = loadPhase0Env();
    const base = (env.r2AssetImagesPublicBase || "").replace(/\/$/, "");
    if (base) return `${base}/${objectKey}`;
    const account = env.r2AccountId || "ACCOUNT";
    const bucket = this.bucketName();
    return `https://${bucket}.${account}.r2.cloudflarestorage.com/${objectKey}`;
  }

  assertAssetKey(key: string): void {
    if (!key.startsWith("assets/")) {
      throw new BadRequestException("asset image key must start with assets/");
    }
    if (key.includes("..") || key.includes("://")) {
      throw new BadRequestException("invalid asset image key");
    }
    if (key.startsWith("kyc/")) {
      throw new BadRequestException("kyc keys forbidden on asset-images bucket");
    }
  }

  /**
   * Register Admin-uploaded bytes metadata → public URL + admin_r2 source.
   * Actual S3 PUT uses signed URL when creds present; Phase0 may pass-through URL.
   */
  resolveAdminUpload(input: {
    assetId: string;
    category: "watch" | "trading_card" | "luxury_bag";
    contentType?: string;
    /** When client already uploaded to R2 / CDN */
    publicUrl?: string;
    objectKey?: string;
  }): {
    imageUrl: string;
    imageSource: "admin_r2";
    objectKey: string;
    bucket: string;
  } {
    const objectKey =
      input.objectKey?.trim() ||
      this.buildObjectKey({
        assetId: input.assetId,
        category: input.category,
        contentType: input.contentType,
      });
    this.assertAssetKey(objectKey);

    let imageUrl = String(input.publicUrl ?? "").trim();
    if (!imageUrl) {
      imageUrl = this.buildPublicUrl(objectKey);
    }
    if (!/^https:\/\//i.test(imageUrl)) {
      throw new BadRequestException("asset imageUrl must be https");
    }

    return {
      imageUrl,
      imageSource: "admin_r2",
      objectKey,
      bucket: this.bucketName(),
    };
  }

  /** Lightweight SigV4-ish PUT URL hint when creds present (no SDK). */
  signedPutHint(objectKey: string, contentType = "image/jpeg"): {
    method: "PUT";
    url: string;
    headers: Record<string, string>;
    expiresInSec: number;
  } | null {
    if (!this.configured()) return null;
    this.assertAssetKey(objectKey);
    const env = loadPhase0Env();
    const expiresInSec = 300;
    const host = `${this.bucketName()}.${env.r2AccountId}.r2.cloudflarestorage.com`;
    const amzDate = new Date()
      .toISOString()
      .replace(/[:-]|\.\d{3}/g, "")
      .slice(0, 15) + "Z";
    const datestamp = amzDate.slice(0, 8);
    const credential = `${env.r2AccessKeyId}/${datestamp}/auto/s3/aws4_request`;
    // Deterministic placeholder signature (real SigV4 = Infra hardening).
    // Admin may also PUT via Wrangler / CF dashboard and pass publicUrl.
    const payload = `${objectKey}|${contentType}|${expiresInSec}|${amzDate}`;
    const sig = createHmac("sha256", env.r2SecretAccessKey || randomBytes(16))
      .update(payload)
      .digest("hex")
      .slice(0, 64);
    const url =
      `https://${host}/${objectKey}` +
      `?X-Amz-Algorithm=AWS4-HMAC-SHA256` +
      `&X-Amz-Credential=${encodeURIComponent(credential)}` +
      `&X-Amz-Date=${amzDate}` +
      `&X-Amz-Expires=${expiresInSec}` +
      `&X-Amz-SignedHeaders=content-type%3Bhost` +
      `&X-Amz-Signature=${sig}`;
    return {
      method: "PUT",
      url,
      headers: { "Content-Type": contentType },
      expiresInSec,
    };
  }

  contentHash(bytes: Buffer): string {
    return createHash("sha256").update(bytes).digest("hex").slice(0, 16);
  }

  private normalizeExt(
    ext?: string,
    contentType?: string,
  ): string {
    let e = String(ext ?? "")
      .trim()
      .toLowerCase()
      .replace(/^\./, "");
    if (!e && contentType) {
      if (contentType.includes("png")) e = "png";
      else if (contentType.includes("webp")) e = "webp";
      else if (contentType.includes("gif")) e = "gif";
      else e = "jpg";
    }
    if (!e) e = "jpg";
    if (e === "jpeg") e = "jpg";
    if (!ALLOWED_EXT.has(e)) {
      throw new BadRequestException(`unsupported image ext: ${e}`);
    }
    return e;
  }
}
