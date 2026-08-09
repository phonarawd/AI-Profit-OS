import { API_BASE } from "./constants";

export interface YgoCardRef {
  id: string;
  name: string;
  type?: string;
  race?: string;
  imageSmall?: string;
  imageUrl?: string;
  /** cardprices[0].cardmarket_price etc — reference only */
  marketHintUsd?: string;
}

export async function fetchCardInfo(opts: {
  name?: string;
  fname?: string;
}): Promise<{ cards: YgoCardRef[]; dryRun: boolean; error?: string }> {
  const url = new URL(`${API_BASE}/cardinfo.php`);
  if (opts.name) url.searchParams.set("name", opts.name);
  else if (opts.fname) url.searchParams.set("fname", opts.fname);
  else url.searchParams.set("fname", "Dark Magician");
  url.searchParams.set("num", "5");
  url.searchParams.set("offset", "0");

  try {
    const res = await fetch(url.toString(), {
      headers: { accept: "application/json" },
    });
    if (!res.ok) {
      return { cards: [], dryRun: false, error: `ygoprodeck ${res.status}` };
    }
    const json = (await res.json()) as {
      data?: Array<{
        id?: number;
        name?: string;
        type?: string;
        race?: string;
        card_images?: Array<{
          image_url?: string;
          image_url_small?: string;
        }>;
        card_prices?: Array<{
          cardmarket_price?: string;
          tcgplayer_price?: string;
          ebay_price?: string;
        }>;
      }>;
    };
    const cards: YgoCardRef[] = (json.data ?? [])
      .filter((c) => c.id != null && c.name)
      .map((c) => {
        const priceRow = c.card_prices?.[0];
        const hint =
          priceRow?.tcgplayer_price ||
          priceRow?.ebay_price ||
          priceRow?.cardmarket_price;
        return {
          id: String(c.id),
          name: String(c.name),
          type: c.type,
          race: c.race,
          imageSmall: c.card_images?.[0]?.image_url_small,
          imageUrl: c.card_images?.[0]?.image_url,
          marketHintUsd: hint && hint !== "0" ? String(hint) : undefined,
        };
      });
    return { cards, dryRun: false };
  } catch (e) {
    return {
      cards: [],
      dryRun: false,
      error: e instanceof Error ? e.message : "ygoprodeck_failed",
    };
  }
}
