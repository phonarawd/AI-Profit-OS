"use client";

import { useEffect, useRef, useState } from "react";
import { SD_ASSETS } from "../spark-dash-home/assets";
import type { OpportunityRoomItem, OpportunityRoomMediaState } from "./types";

export function EbayMark() {
  return (
    <span className="sdr-ebay">
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
  state,
}: {
  item: OpportunityRoomItem;
  state: Extract<OpportunityRoomMediaState, "MISSING" | "BROKEN" | "POLICY_UNKNOWN">;
}) {
  return (
    <div
      className={`sdr-media is-mark is-${item.partnerKind}`}
      data-sdr="media"
      data-sdr-media={state}
    >
      <span className="sdr-media-watermark" aria-hidden>
        {fallbackMark(item.title)}
      </span>
      <img className="sdr-media-bloom" src={SD_ASSETS.energyBloom1} alt="" />
      <img className="sdr-media-streak" src={SD_ASSETS.energyStreaks} alt="" />
      <img className="sdr-media-spark" src={SD_ASSETS.sparkMark} alt="" />
      <span className="sdr-media-floor" />
      <div className="sdr-media-copy">
        {item.partnerKind === "ebay" ? (
          <EbayMark />
        ) : item.partner ? (
          <p className="sdr-media-partner">{item.partner}</p>
        ) : null}
        <p className="sdr-media-title">{item.title}</p>
      </div>
    </div>
  );
}

function PhotoSlot({ item, url }: { item: OpportunityRoomItem; url: string }) {
  const imgRef = useRef<HTMLImageElement | null>(null);
  const [state, setState] = useState<
    Extract<OpportunityRoomMediaState, "LOADING" | "AVAILABLE" | "BROKEN">
  >(item.mediaState === "AVAILABLE" ? "AVAILABLE" : "LOADING");

  useEffect(() => {
    const el = imgRef.current;
    if (!el || !el.complete) return;
    if (el.naturalWidth > 0) setState("AVAILABLE");
    else setState("BROKEN");
  }, [url]);

  if (state === "BROKEN") {
    return <MediaFallback item={item} state="BROKEN" />;
  }

  return (
    <div
      className={`sdr-media is-photo${state === "LOADING" ? " is-loading" : ""} is-${item.partnerKind}`}
      data-sdr="media"
      data-sdr-media={state}
    >
      {state === "LOADING" ? <span className="sdr-media-skel" aria-hidden /> : null}
      <img className="sdr-media-bloom" src={SD_ASSETS.energyBloom2} alt="" />
      <img className="sdr-media-streak" src={SD_ASSETS.energyStreaks} alt="" />
      <img
        ref={imgRef}
        className="sdr-media-shot"
        src={url}
        alt={item.productMediaAlt}
        onLoad={() => setState("AVAILABLE")}
        onError={() => setState("BROKEN")}
      />
      <span className="sdr-media-floor" />
    </div>
  );
}

export function OpportunityRoomMedia({ item }: { item: OpportunityRoomItem }) {
  const url = item.productMediaUrl;
  if (
    item.mediaState === "POLICY_UNKNOWN" ||
    item.mediaState === "MISSING" ||
    !url
  ) {
    return (
      <MediaFallback
        item={item}
        state={item.mediaState === "POLICY_UNKNOWN" ? "POLICY_UNKNOWN" : "MISSING"}
      />
    );
  }
  return <PhotoSlot key={url} item={item} url={url} />;
}
