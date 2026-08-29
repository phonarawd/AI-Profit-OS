"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { Skeleton } from "../../primitives/Skeleton";
import {
  assetIconForCategory,
  type AssetCategory,
  type AssetImageSource,
} from "./image-hosts";
import {
  productImageSizes,
  type ProductImageVariant,
} from "./product-image-sizes";

export type ProductImageStatus = "loading" | "loaded" | "error" | "missing";

export type ProductImageProps = {
  /** OpportunityCard.assetImageUrl — empty/null → missing fallback */
  src?: string | null;
  /** Required schema field assetImageAltKo */
  alt: string;
  category: AssetCategory | string;
  /**
   * Schema assetImageSource — accepted for telemetry (`data-image-source`) only.
   * Render path is identical for ebay | pokemontcg | ygoprodeck | admin_r2.
   */
  imageSource?: AssetImageSource | string | null;
  /** Engine assetIcon; category default if omitted */
  assetIcon?: string | null;
  /** Hero / first above-the-fold card only (§5.3 [C] · audit §37) */
  priority?: boolean;
  /** Override responsive sizes; default from productImageSizes(variant) */
  sizes?: string;
  variant?: ProductImageVariant;
  className?: string;
};

const variantBox: Record<ProductImageVariant, string> = {
  card: "w-full",
  thumb: "h-16 w-16 shrink-0",
  detail: "w-full max-w-md",
};

/**
 * Source-agnostic product media — audit §26 / §37 Image Performance Architecture.
 * States: loading · loaded · error · missing. Never blank / broken-icon chrome.
 */
export function ProductImage({
  src,
  alt,
  category,
  imageSource,
  assetIcon,
  priority = false,
  sizes,
  variant = "card",
  className = "",
}: ProductImageProps) {
  const trimmed = (src ?? "").trim();
  const [status, setStatus] = useState<ProductImageStatus>(() =>
    trimmed ? "loading" : "missing",
  );

  useEffect(() => {
    setStatus(trimmed ? "loading" : "missing");
  }, [trimmed]);

  const icon = (assetIcon ?? "").trim() || assetIconForCategory(category);
  const showFallback = status === "error" || status === "missing";
  const showImage = Boolean(trimmed) && status !== "error" && status !== "missing";
  const resolvedSizes = sizes ?? productImageSizes(variant);

  return (
    <div
      data-testid="product-image"
      data-image-source={imageSource || "none"}
      data-image-status={status}
      data-category={category}
      data-variant={variant}
      data-priority={priority ? "1" : "0"}
      className={[
        "pd-card-image relative overflow-hidden bg-pd-elevated",
        variantBox[variant],
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {status === "loading" ? (
        <Skeleton
          className="absolute inset-0 h-full w-full rounded-none"
          aspectRatio="1 / 1"
        />
      ) : null}

      {showFallback ? (
        <div
          role="img"
          aria-label={alt}
          data-testid="product-image-fallback"
          className="absolute inset-0 flex items-center justify-center text-3xl text-pd-text-muted"
        >
          <span aria-hidden>{icon}</span>
        </div>
      ) : null}

      {showImage ? (
        <Image
          src={trimmed}
          alt={alt}
          fill
          sizes={resolvedSizes}
          priority={priority}
          loading={priority ? undefined : "lazy"}
          fetchPriority={priority ? "high" : "auto"}
          decoding="async"
          /**
           * Phase0 Cloudflare / OpenNext: no image optimizer worker.
           * Hotlink Day-1 (§9); CDN/proxy transform = measured follow-up (§37).
           */
          unoptimized
          className={[
            "object-cover",
            status === "loaded" ? "opacity-100" : "opacity-0",
          ].join(" ")}
          onLoad={() => setStatus("loaded")}
          onError={() => setStatus("error")}
        />
      ) : null}
    </div>
  );
}
