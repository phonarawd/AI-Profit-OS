/**
 * Spark Dash Mobile Figma MCP asset pull.
 * Desktop public/spark-dash 기존 파일은 덮어쓰지 않는다.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const dest = path.join(here, "../public/spark-dash");
const refs = path.join(here, "../../../_tmp_spark_dash_refs");

const assets = {
  "mobile-product-sneaker.png":
    "https://www.figma.com/api/mcp/asset/aa33fcfb-31f5-4b67-b97b-6dddcd619d9f.png",
  "mobile-brand-spark.svg":
    "https://www.figma.com/api/mcp/asset/bfab9d8e-92e4-47cd-b12b-5d33dd83b0da.svg",
  "mobile-icon-notification.svg":
    "https://www.figma.com/api/mcp/asset/b91cd20f-25e6-4752-aa1d-662e374b6651.svg",
  "mobile-hero-lightning.svg":
    "https://www.figma.com/api/mcp/asset/9672d680-260a-4f6a-b99c-e6e1b95a304b.svg",
  "mobile-icon-explore.svg":
    "https://www.figma.com/api/mcp/asset/b09c11a9-df61-4133-9ff6-b925e018a724.svg",
  "mobile-icon-wallet.svg":
    "https://www.figma.com/api/mcp/asset/bd62786c-56c4-4abd-a210-9d397794033a.svg",
  "mobile-ai-orb.svg":
    "https://www.figma.com/api/mcp/asset/bf1e557d-afcb-40e4-8eb1-89b7cd60c847.svg",
  "mobile-icon-lightning.svg":
    "https://www.figma.com/api/mcp/asset/6468eff4-915d-4167-a1cf-4f97e3e122b7.svg",
  "mobile-icon-clock.svg":
    "https://www.figma.com/api/mcp/asset/af59369c-a4e3-4b7e-b95b-fe2d7a9e12b8.svg",
  "mobile-icon-trend.svg":
    "https://www.figma.com/api/mcp/asset/f44bde28-801f-4353-bd20-ee2da8854f66.svg",
  "mobile-icon-trophy.svg":
    "https://www.figma.com/api/mcp/asset/b73c8917-6a3f-4c2c-ac07-bd87b9799aea.svg",
  "mobile-icon-home.svg":
    "https://www.figma.com/api/mcp/asset/7864b10c-fd2d-43da-9b56-6f1a2645346c.svg",
  "mobile-icon-nav-explore.svg":
    "https://www.figma.com/api/mcp/asset/ebfedeaa-448d-4194-abd3-8c19f698b918.svg",
  "mobile-icon-nav-wallet.svg":
    "https://www.figma.com/api/mcp/asset/ae414c0d-a11d-472e-b49f-7599fd8e5f8f.svg",
  "mobile-icon-nav-bell.svg":
    "https://www.figma.com/api/mcp/asset/3ed7fd02-ca9d-4df5-ba26-dba32aa97e46.svg",
};

const refsAssets = {
  "figma-mobile-390x693.png":
    "https://www.figma.com/api/mcp/asset/07f8bc15-3bd1-4278-9c6f-3e8547762473.png",
  "figma-mobile-390x844.png":
    "https://www.figma.com/api/mcp/asset/6f6c6d60-955b-46f4-9655-0b49bfbeef88.png",
};

fs.mkdirSync(dest, { recursive: true });
fs.mkdirSync(refs, { recursive: true });

async function pull(dir, map) {
  for (const [name, url] of Object.entries(map)) {
    const out = path.join(dir, name);
    const res = await fetch(url);
    if (!res.ok) {
      console.error(`FAIL ${name} ${res.status}`);
      continue;
    }
    const buf = Buffer.from(await res.arrayBuffer());
    fs.writeFileSync(out, buf);
    console.log(`ok ${name} ${buf.length}`);
  }
}

await pull(dest, assets);
await pull(refs, refsAssets);
