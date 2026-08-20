/**
 * Spark Dash Figma MCP asset pull — local public copies (remote URLs expire ~7d).
 * Visual fixture / Home Desktop presentation only.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const dest = path.join(here, "../public/spark-dash");

const assets = {
  "hero-lightning-raster.png":
    "https://www.figma.com/api/mcp/asset/e262975e-2b31-4677-8397-9ca3ca95a99f.png",
  "opportunity-energy.png":
    "https://www.figma.com/api/mcp/asset/42ee37fa-732e-4e26-8138-0b3bbca0b8cb.png",
  "product-sneaker.png":
    "https://www.figma.com/api/mcp/asset/e186c951-81e5-4c3a-bd7e-d618bd468093.png",
  "product-sneaker-mask.svg":
    "https://www.figma.com/api/mcp/asset/7c341eaf-3198-4c7a-904c-d7dc57d20484.svg",
  "brand-spark.svg":
    "https://www.figma.com/api/mcp/asset/949c1b1e-9fc7-4ef5-b897-c71d049c84d7.svg",
  "icon-home.svg":
    "https://www.figma.com/api/mcp/asset/25ddcc60-9369-4532-8704-ba09cd53c131.svg",
  "icon-opportunity.svg":
    "https://www.figma.com/api/mcp/asset/a00bed4b-b81c-41d1-a8ee-224175f93697.svg",
  "icon-wallet.svg":
    "https://www.figma.com/api/mcp/asset/0fd6d521-b80d-4833-b656-4df6abba1d33.svg",
  "icon-partner.svg":
    "https://www.figma.com/api/mcp/asset/ca130b73-77a8-4320-a25d-1eeaa11d0e98.svg",
  "icon-bell.svg":
    "https://www.figma.com/api/mcp/asset/da0484c3-80a0-4fa1-8eca-fe784e9943ec.svg",
  "icon-settings.svg":
    "https://www.figma.com/api/mcp/asset/5b1e109a-e4d8-45cd-bece-6444945fef36.svg",
  "header-signal.svg":
    "https://www.figma.com/api/mcp/asset/5996484c-cd01-4ac7-828a-194d6a134578.svg",
  "header-bell.svg":
    "https://www.figma.com/api/mcp/asset/7eae6ec9-7b51-4893-adee-08753270fdfd.svg",
  "headline-spark.svg":
    "https://www.figma.com/api/mcp/asset/8c90c42a-d8c7-45f6-b1bd-775a199d74f0.svg",
  "hero-lightning.svg":
    "https://www.figma.com/api/mcp/asset/1cb3d2b8-6020-4c52-9c75-89769e32f3ca.svg",
  "hero-lightning-neon.svg":
    "https://www.figma.com/api/mcp/asset/07e3f82c-7d8a-42c6-8cfa-e6b2e5d5f7e4.svg",
  "hero-halo.svg":
    "https://www.figma.com/api/mcp/asset/9c6b76cc-b050-48e9-8c47-0fae79c58e06.svg",
  "ambient-glow.svg":
    "https://www.figma.com/api/mcp/asset/ac1d1ec0-e3d2-4cc5-8ecc-32d951d03944.svg",
  "ai-pink-glow.svg":
    "https://www.figma.com/api/mcp/asset/841f1532-814e-484b-b2ed-dd3d68a8d718.svg",
  "mini-spark.svg":
    "https://www.figma.com/api/mcp/asset/a799c2ba-eaff-4cf4-9d28-23a51cc208e6.svg",
  "ai-orb.svg":
    "https://www.figma.com/api/mcp/asset/6fcdb029-11b5-4070-8e1d-c4f545660cbb.svg",
  "ai-eye.svg":
    "https://www.figma.com/api/mcp/asset/3b549ba1-a116-4588-ad90-1152651069e2.svg",
  "ai-ring.svg":
    "https://www.figma.com/api/mcp/asset/6b9913bb-8572-4b72-b68d-fc58c5329e4e.svg",
  "ai-eye-right.svg":
    "https://www.figma.com/api/mcp/asset/a4237360-7a90-4c55-8410-b5a970bf3529.svg",
  "energy-bloom-1.svg":
    "https://www.figma.com/api/mcp/asset/bdb61494-c7b6-41a2-827f-2ea1d72cc42d.svg",
  "energy-bloom-2.svg":
    "https://www.figma.com/api/mcp/asset/7c328896-62da-499a-bc96-d120e13fe67e.svg",
  "energy-bloom-3.svg":
    "https://www.figma.com/api/mcp/asset/f85bdb38-d8ca-452e-a3ec-ca4a54f27e94.svg",
  "avatar-face.svg":
    "https://www.figma.com/api/mcp/asset/7f540f03-4e29-462e-8220-51ccb69a2bfc.svg",
  "avatar-hair.svg":
    "https://www.figma.com/api/mcp/asset/ed294f8f-8ea3-40f7-be4e-6f8b49848520.svg",
  "avatar-body.svg":
    "https://www.figma.com/api/mcp/asset/faf34703-7237-4c70-92c5-eb8afc3e1d00.svg",
  "avatar-online.svg":
    "https://www.figma.com/api/mcp/asset/3011e365-a570-42a8-b8e2-5a3d3ba0611c.svg",
};

fs.mkdirSync(dest, { recursive: true });

for (const [name, url] of Object.entries(assets)) {
  const out = path.join(dest, name);
  const res = await fetch(url);
  if (!res.ok) {
    console.error(`FAIL ${name} ${res.status}`);
    continue;
  }
  const buf = Buffer.from(await res.arrayBuffer());
  fs.writeFileSync(out, buf);
  console.log(`ok ${name} ${buf.length}`);
}
