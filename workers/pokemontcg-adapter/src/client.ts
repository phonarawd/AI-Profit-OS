import { API_BASE } from "./constants";

export interface PokemonCardRef {
  id: string;
  name: string;
  setName?: string;
  number?: string;
  rarity?: string;
  imageSmall?: string;
  imageLarge?: string;
  /** Reference market hint only — not a listing leg */
  marketHintUsd?: string;
}

export async function fetchCards(opts: {
  query?: string;
  pageSize?: number;
  apiKey?: string;
}): Promise<{ cards: PokemonCardRef[]; dryRun: boolean; error?: string }> {
  const q = opts.query?.trim() || "name:charizard";
  const url = new URL(`${API_BASE}/cards`);
  url.searchParams.set("q", q);
  url.searchParams.set("pageSize", String(opts.pageSize ?? 5));

  try {
    const res = await fetch(url.toString(), {
      headers: {
        accept: "application/json",
        ...(opts.apiKey ? { "X-Api-Key": opts.apiKey } : {}),
      },
    });
    if (!res.ok) {
      return { cards: [], dryRun: false, error: `pokemontcg ${res.status}` };
    }
    const json = (await res.json()) as {
      data?: Array<{
        id?: string;
        name?: string;
        set?: { name?: string };
        number?: string;
        rarity?: string;
        images?: { small?: string; large?: string };
        tcgplayer?: { prices?: Record<string, { market?: number; mid?: number }> };
      }>;
    };
    const cards: PokemonCardRef[] = (json.data ?? [])
      .filter((c) => c.id && c.name)
      .map((c) => {
        const prices = c.tcgplayer?.prices ?? {};
        const first = Object.values(prices)[0];
        const hint =
          first?.market != null
            ? String(first.market)
            : first?.mid != null
              ? String(first.mid)
              : undefined;
        return {
          id: String(c.id),
          name: String(c.name),
          setName: c.set?.name,
          number: c.number,
          rarity: c.rarity,
          imageSmall: c.images?.small,
          imageLarge: c.images?.large,
          marketHintUsd: hint,
        };
      });
    return { cards, dryRun: false };
  } catch (e) {
    return {
      cards: [],
      dryRun: false,
      error: e instanceof Error ? e.message : "pokemontcg_failed",
    };
  }
}
