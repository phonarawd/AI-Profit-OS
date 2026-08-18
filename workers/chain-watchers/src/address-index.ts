/**
 * §43.1 address-index — local Set match against single Transfer stream.
 * Per-address RPC polling FORBIDDEN.
 */

export type DepositAddressEntry = {
  trc20Address: string;
  userId: string;
};

export class AddressIndex {
  private readonly byAddress = new Map<string, string>();

  constructor(entries: DepositAddressEntry[] = []) {
    this.replaceAll(entries);
  }

  replaceAll(entries: DepositAddressEntry[]): void {
    this.byAddress.clear();
    for (const e of entries) {
      const key = normalizeTrc20(e.trc20Address);
      if (!key || !e.userId) continue;
      this.byAddress.set(key, e.userId);
    }
  }

  size(): number {
    return this.byAddress.size;
  }

  /** O(1) match — stream filter only */
  resolveUserId(trc20Address: string): string | undefined {
    return this.byAddress.get(normalizeTrc20(trc20Address));
  }

  has(trc20Address: string): boolean {
    return this.byAddress.has(normalizeTrc20(trc20Address));
  }
}

export function normalizeTrc20(address: string): string {
  return (address ?? "").trim();
}
