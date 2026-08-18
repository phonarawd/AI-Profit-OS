# workers

| Worker | Phase |
|--------|-------|
| push-dispatcher | 0 (stub live) |
| marketing-capi-dispatcher | 1+ |
| chain-watchers | **Phase0 = Nest in-process emit** · **Phase1+ CF deploy** (§43.1 single stream · 1/19) |
| chain-sweeper | **Phase0 = Nest in-process emit** · **Phase1+ CF deploy** (§43.2 Energy+TRX guard · Admin pause) |
| ebay-adapter | **Phase1 CF deploy** · Browse multi `marketplaceId` (US/GB/DE/AU) · **Day-1 listing legs** |
| amazon-adapter | **Phase1+ CF deploy** · PA-API multi market (`amazon_us/jp/de`) · official partner (§0.0.1c) · **not Day-1 auto-publish** |
| yahoo-jp-adapter | **Phase1+ CF deploy** · Yahoo! JAPAN Auction official partner (§0.0.1c · v7.22.41) · **not Day-1 auto-publish** |
| pokemontcg-adapter | **Phase1 CF deploy** · pokemon catalog + ref price |
| ygoprodeck-adapter | **Phase1 CF deploy** · yugioh catalog + ref price |
| coingecko-adapter | **Phase1 CF deploy** · USDT FX |
| frankfurter-adapter | **Phase1 CF deploy** · fiat FX |

Day-1 Opportunity auto-publish listing legs = **ebay multi | admin only**.  
`amazon-adapter` / `yahoo-jp-adapter` = official partners (registry §0.0.1c) · Phase1+ leg data.

Deploy: `infra/workers.manifest.json` · `pnpm cf:deploy:workers preview phase1`
