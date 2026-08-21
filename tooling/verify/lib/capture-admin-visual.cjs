/**
 * Admin local visual capture. Figma 없음. production host 금지.
 */
"use strict";

const fs = require("node:fs");
const path = require("node:path");
const { spawn } = require("node:child_process");
const http = require("node:http");
const net = require("node:net");

const root = path.resolve(__dirname, "../../..");
const adminRoot = path.join(root, "apps/admin");
const nextBin = path.join(adminRoot, "node_modules/next/dist/bin/next");

function probe(url) {
  return new Promise((resolve) => {
    const req = http.get(url, { timeout: 2500 }, (res) => {
      res.resume();
      resolve(typeof res.statusCode === "number" && res.statusCode < 500);
    });
    req.on("error", () => resolve(false));
    req.on("timeout", () => {
      req.destroy();
      resolve(false);
    });
  });
}

function findFreePort(start) {
  return new Promise((resolve, reject) => {
    const tryPort = (port) => {
      if (port > start + 20) {
        reject(new Error("no free port"));
        return;
      }
      const server = net.createServer();
      server.once("error", () => tryPort(port + 1));
      server.listen(port, "127.0.0.1", () => server.close(() => resolve(port)));
    };
    tryPort(start);
  });
}

async function main() {
  const ev = path.join(root, "governance/visual-reconciliation/admin");
  fs.mkdirSync(ev, { recursive: true });
  if (!fs.existsSync(nextBin)) {
    fs.writeFileSync(
      path.join(ev, "QA.md"),
      "# Admin runtime\n\nADMIN_RUNTIME = UNVERIFIED\nREASON = next binary missing\nFIGMA_STATUS = NOT_FOUND\n",
    );
    console.log("[capture-admin-visual] UNVERIFIED next missing");
    return;
  }
  const port = await findFreePort(3100);
  const baseUrl = `http://127.0.0.1:${port}`;
  const child = spawn(
    process.execPath,
    [nextBin, "dev", "--webpack", "--port", String(port), "--hostname", "127.0.0.1"],
    {
      cwd: adminRoot,
      env: {
        ...process.env,
        BROWSER: "none",
        NODE_OPTIONS: process.env.NODE_OPTIONS || "--max-old-space-size=1536",
        NEXT_DEV_SKIP_OPENNEXT: "1",
      },
      stdio: ["ignore", "pipe", "pipe"],
      windowsHide: true,
    },
  );
  let output = "";
  child.stdout.on("data", (b) => {
    output += String(b);
  });
  child.stderr.on("data", (b) => {
    output += String(b);
  });
  const deadline = Date.now() + 180000;
  let ready = false;
  while (Date.now() < deadline) {
    if (child.exitCode != null) break;
    if (await probe(baseUrl)) {
      ready = true;
      break;
    }
    await new Promise((r) => setTimeout(r, 1000));
  }
  if (!ready) {
    if (child.pid) spawn("taskkill", ["/pid", String(child.pid), "/T", "/F"], { stdio: "ignore", windowsHide: true });
    fs.writeFileSync(
      path.join(ev, "QA.md"),
      `# Admin runtime\n\nADMIN_RUNTIME = UNVERIFIED\nFIGMA_STATUS = NOT_FOUND\n\n\`\`\`\n${output.slice(-2000)}\n\`\`\`\n`,
    );
    console.log("[capture-admin-visual] UNVERIFIED");
    return;
  }
  const { chromium } = require("@playwright/test");
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  const routes = [
    ["/admin", "dashboard"],
    ["/admin/users", "users"],
    ["/admin/ledger", "ledger"],
    ["/admin/wallet", "wallet"],
  ];
  for (const [route, name] of routes) {
    await page.setViewportSize({ width: 1440, height: 1080 });
    await page.goto(`${baseUrl}${route}`, { waitUntil: "load" }).catch(() => {});
    await page.waitForTimeout(500);
    await page.screenshot({
      path: path.join(ev, `${name}-RUNTIME_DESKTOP.png`),
      fullPage: false,
    });
  }
  await browser.close();
  if (child.pid) spawn("taskkill", ["/pid", String(child.pid), "/T", "/F"], { stdio: "ignore", windowsHide: true });
  fs.writeFileSync(
    path.join(ev, "QA.md"),
    "# Admin runtime\n\nFIGMA_STATUS = NOT_FOUND\nADMIN_RUNTIME = BROWSER_CAPTURED\nFOUNDER_APPROVED = NO\n\nCaptured /admin /admin/users /admin/ledger /admin/wallet at 1440.\n",
  );
  console.log("[capture-admin-visual] wrote admin captures");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
