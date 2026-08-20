"use client";

import { useEffect, useRef, useState } from "react";
import { SD_ASSETS } from "../spark-dash-home/assets";
import type { ProfitsMediaState, ProfitsOpportunity } from "./types";

function EbayMark() {
  return (
    <span className="sdp-ebay">
      <span className="e">e</span>
      <span className="b">B</span>
      <span className="a">a</span>
      <span className="y">y</span>
    </span>
  );
}

function fallbackMark(title: string): string {
  return title.replace(/[^A-Za-z0-9가-힣]/g, "").slice(0, 1) || "P";
}

function MediaFallback({
  item,
  featured,
  state,
}: {
  item: ProfitsOpportunity;
  featured?: boolean;
  state: Extract<ProfitsMediaState, "MISSING" | "BROKEN" | "POLICY_UNKNOWN">;
}) {
  return (
    <div
      className={`sdp-media is-mark is-${item.partnerKind}${featured ? " is-feat" : ""}`}
      data-sdp="media"
      data-sdp-media={state}
    >
      <span className="sdp-media-watermark" aria-hidden>
        {fallbackMark(item.title)}
      </span>
      <img className="sdp-media-bloom" src={SD_ASSETS.energyBloom1} alt="" />
      <img className="sdp-media-streak" src={SD_ASSETS.energyStreaks} alt="" />
      <img className="sdp-media-spark" src={SD_ASSETS.sparkMark} alt="" />
      <span className="sdp-media-floor" />
      <div className="sdp-media-copy">
        {item.partnerKind === "ebay" ? (
          <EbayMark />
        ) : (
          <p className="sdp-media-partner">{item.partner}</p>
        )}
        <p className="sdp-media-title">{item.title}</p>
      </div>
    </div>
  );
}

function PhotoSlot({
  item,
  featured,
  url,
}: {
  item: ProfitsOpportunity;
  featured?: boolean;
  url: string;
}) {
  const imgRef = useRef<HTMLImageElement | null>(null);
  const [state, setState] = useState<
    Extract<ProfitsMediaState, "LOADING" | "AVAILABLE" | "BROKEN">
  >(item.mediaState === "AVAILABLE" ? "AVAILABLE" : "LOADING");

  useEffect(() => {
    const el = imgRef.current;
    if (!el || !el.complete) return;
    if (el.naturalWidth > 0) setState("AVAILABLE");
    else setState("BROKEN");
  }, [url]);

  if (state === "BROKEN") {
    return <MediaFallback item={item} featured={featured} state="BROKEN" />;
  }

  return (
    <div
      className={`sdp-media is-photo${state === "LOADING" ? " is-loading" : ""} is-${item.partnerKind}${featured ? " is-feat" : ""}`}
      data-sdp="media"
      data-sdp-media={state}
    >
      {state === "LOADING" ? (
        <span className="sdp-media-skel" aria-hidden />
      ) : null}
      <img className="sdp-media-bloom" src={SD_ASSETS.energyBloom2} alt="" />
      <img className="sdp-media-streak" src={SD_ASSETS.energyStreaks} alt="" />
      <img
        ref={imgRef}
        className="sdp-media-shot"
        src={url}
        alt={item.productMediaAlt}
        onLoad={() => setState("AVAILABLE")}
        onError={() => setState("BROKEN")}
      />
      <span className="sdp-media-floor" />
    </div>
  );
}

export function OpportunityMedia({
  item,
  featured,
}: {
  item: ProfitsOpportunity;
  featured?: boolean;
}) {
  // URL EXISTS ≠ DISPLAY AUTHORIZED. gate 미통과 URL은 <img>에 넣지 않는다.
  const url = item.productMediaUrl;
  if (
    item.mediaState === "POLICY_UNKNOWN" ||
    item.mediaState === "MISSING" ||
    !url
  ) {
    return (
      <MediaFallback
        item={item}
        featured={featured}
        state={
          item.mediaState === "POLICY_UNKNOWN" ? "POLICY_UNKNOWN" : "MISSING"
        }
      />
    );
  }

  return <PhotoSlot key={url} item={item} featured={featured} url={url} />;
}

export function PartnerName({
  kind,
  name,
}: {
  kind: ProfitsOpportunity["partnerKind"];
  name: string;
}) {
  if (kind === "ebay") return <EbayMark />;
  return <span className={`sdp-partner is-${kind}`}>{name}</span>;
}
