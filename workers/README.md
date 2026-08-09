# workers

| Worker | Phase |
|--------|-------|
| push-dispatcher | 0 (stub live) |
| marketing-capi-dispatcher | 1+ |
| chain-watchers | **Phase0 = Nest in-process emit** · **Phase1+ CF deploy** (§43.1 single stream · 1/19) |
| chain-sweeper | **Phase0 = Nest in-process emit** · **Phase1+ CF deploy** (§43.2 Energy+TRX guard · Admin pause) |
| ebay / pokemontcg / ygoprodeck / coingecko / frankfurter adapters | 1+ |

`yahoo-jp-adapter` = **FORBIDDEN** (ADR-003).
