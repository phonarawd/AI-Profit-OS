/**
 * Re-export surface for HD xpub helpers (implementation lives in tron-address.ts).
 */
export {
  createXpubTrc20Deriver,
  isTronHotWalletXpub,
  resolveXpubTrc20DeriverFromEnv,
} from "./tron-address";
