/** REL-131 V2.1 Figma 192:194 / 192:434 글리프. Home 에셋과 경로를 섞지 않는다. */

export const HUB_ASSETS = {
  user: "/account-hub/user.svg",
  shield: "/account-hub/shield.svg",
  users: "/account-hub/users.svg",
  inbox: "/account-hub/inbox.svg",
  gear: "/account-hub/gear.svg",
  wallet: "/account-hub/wallet.svg",
  spark: "/account-hub/spark.svg",
  headset: "/account-hub/headset.svg",
  book: "/account-hub/book.svg",
  file: "/account-hub/file.svg",
  gift: "/account-hub/gift.svg",
  card: "/account-hub/card.svg",
  cal: "/account-hub/cal.svg",
  target: "/account-hub/target.svg",
  chevron: "/account-hub/chevron.svg",
} as const;

export type HubAssetName = keyof typeof HUB_ASSETS;
