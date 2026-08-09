"use client";

import { useEffect } from "react";
import { detectDeviceTier } from "@aipo/sdk/device-tier";

/**
 * PART8c §29.1 Law 3 — sets html[data-tier=s|a|b] for CSS degrade paths
 */
export function DeviceTierApply() {
  useEffect(() => {
    const tier = detectDeviceTier().toLowerCase();
    document.documentElement.dataset.tier = tier;
    return () => {
      delete document.documentElement.dataset.tier;
    };
  }, []);

  return null;
}
