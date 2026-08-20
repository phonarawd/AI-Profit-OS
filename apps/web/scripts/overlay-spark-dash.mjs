/**
 * reference-desktop.png 위에 final을 50%로 얹고 overlay를 저장한다.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const here = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(path.join(here, "../../../tooling/verify/stack-lock.cjs"));
const { chromium } = require("@playwright/test");

const dir = path.join(here, "../../../_tmp_spark_dash_refs");
const ref = path.join(dir, "reference-desktop.png");
const fin = path.join(dir, "final-desktop-1440.png");
const overlay = path.join(dir, "overlay-desktop.png");
const htmlPath = path.join(dir, "overlay.html");

const refUrl = "file:///" + ref.replace(/\\/g, "/");
const finUrl = "file:///" + fin.replace(/\\/g, "/");

fs.writeFileSync(
  htmlPath,
  `<!doctype html><html><body style="margin:0;background:#000">
<canvas id="c" width="1440" height="1080"></canvas>
<script>
const c=document.getElementById('c');
const x=c.getContext('2d');
const a=new Image(); const b=new Image();
let n=0;
function go(){ if(++n<2) return;
  x.drawImage(a,0,0,1440,1080);
  x.globalAlpha=0.5;
  x.drawImage(b,0,0,1440,1080);
}
a.onload=go; b.onload=go;
a.src=${JSON.stringify(refUrl)};
b.src=${JSON.stringify(finUrl)};
</script></body></html>`,
);

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 1080 } });
await page.goto("file:///" + htmlPath.replace(/\\/g, "/"));
await page.waitForTimeout(400);
await page.screenshot({ path: overlay, fullPage: false });
await browser.close();
console.log(overlay);
