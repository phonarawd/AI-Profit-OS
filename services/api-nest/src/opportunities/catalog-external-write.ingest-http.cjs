"use strict";

const fs = require("node:fs");
const path = require("node:path");
const http = require("node:http");
const { transpile, ts, uninstall } = require("./catalog-external-write.ts-hook.cjs");
const { Module } = require("@nestjs/common");
const { NestFactory } = require("@nestjs/core");

const TOKEN = "change_me_adapter_ingest_runtime";
const nestSrc = path.resolve(__dirname, "..");
const tmpDir = path.join(nestSrc, "_http_selftest_tmp");

function compileController() {
  const adaptersDir = path.join(tmpDir, "adapters");
  const configDir = path.join(tmpDir, "config");
  fs.mkdirSync(adaptersDir, { recursive: true });
  fs.mkdirSync(configDir, { recursive: true });
  const controllerSrc = fs
    .readFileSync(path.join(nestSrc, "adapters/adapters.ingest.controller.ts"), "utf8")
    .replace(
      'import { AdaptersAdminService } from "./adapters.admin.service";',
      "export class AdaptersAdminService {}",
    );
  const opts = {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      experimentalDecorators: true,
      emitDecoratorMetadata: true,
      esModuleInterop: true,
    },
  };
  fs.writeFileSync(
    path.join(adaptersDir, "adapters.ingest.controller.js"),
    transpile(controllerSrc, { ...opts, fileName: "adapters.ingest.controller.ts" }).outputText,
  );
  fs.writeFileSync(
    path.join(adaptersDir, "adapters.routes.js"),
    transpile(
      fs.readFileSync(path.join(nestSrc, "adapters/adapters.routes.ts"), "utf8"),
      { ...opts, fileName: "adapters.routes.ts" },
    ).outputText,
  );
  fs.writeFileSync(
    path.join(configDir, "phase0.env.js"),
    transpile(
      fs.readFileSync(path.join(nestSrc, "config/phase0.env.ts"), "utf8"),
      { ...opts, fileName: "phase0.env.ts" },
    ).outputText,
  );
}

function httpPost(port, headers, body) {
  return new Promise((resolve, reject) => {
    const payload = Buffer.from(JSON.stringify(body));
    const r = http.request(
      {
        host: "127.0.0.1",
        port,
        path: "/internal/adapters/ingest",
        method: "POST",
        agent: false,
        headers: {
          "content-type": "application/json",
          "content-length": String(payload.length),
          ...headers,
        },
      },
      (res) => {
        let data = "";
        res.on("data", (chunk) => {
          data += String(chunk);
        });
        res.on("end", () => {
          res.resume();
          resolve({ status: res.statusCode || 0, body: data });
        });
      },
    );
    r.on("error", reject);
    r.write(payload);
    r.end();
  });
}

async function closeSelftestApp(app) {
  const server = app.getHttpServer();
  if (server && typeof server.closeAllConnections === "function") {
    server.closeAllConnections();
  }
  await app.close();
  if (server && server.listening) {
    await new Promise((resolve, reject) => {
      server.close((err) => (err ? reject(err) : resolve()));
    });
  }
}

async function main() {
  compileController();
  const {
    AdaptersIngestController,
    AdaptersAdminService,
  } = require(path.join(tmpDir, "adapters/adapters.ingest.controller.js"));

  let calls = 0;
  const mockService = {
    ingest: async (body) => {
      calls += 1;
      return { ok: true, adapterId: body.adapterId || "", accepted: 0 };
    },
  };
  class SelfTestModule {}
  Module({
    controllers: [AdaptersIngestController],
    providers: [{ provide: AdaptersAdminService, useValue: mockService }],
  })(SelfTestModule);

  const app = await NestFactory.create(SelfTestModule, { logger: false });
  await app.listen(0);
  const address = app.getHttpServer().address();
  const port = typeof address === "object" && address ? address.port : 0;
  const results = [];
  const record = (name, ok, detail) => results.push({ name, ok, detail });

  try {
    delete process.env.ADAPTER_INGEST_TOKEN;
    const unset = await httpPost(port, {}, { adapterId: "ebay", dryRun: true });
    record(
      "unset token -> HTTP 503",
      unset.status === 503 &&
        unset.body.includes("ADAPTER_INGEST_TOKEN_NOT_CONFIGURED") &&
        calls === 0,
      "status=" + unset.status + " calls=" + calls,
    );
    process.env.ADAPTER_INGEST_TOKEN = TOKEN;
    const missing = await httpPost(port, {}, { adapterId: "ebay", dryRun: true });
    record(
      "missing header -> HTTP 401",
      missing.status === 401 &&
        missing.body.includes("ADAPTER_INGEST_TOKEN_INVALID") &&
        calls === 0,
      "status=" + missing.status + " calls=" + calls,
    );
    const wrong = await httpPost(
      port,
      { "x-adapter-token": "wrong" },
      { adapterId: "ebay", dryRun: true },
    );
    record(
      "wrong token -> HTTP 401",
      wrong.status === 401 &&
        wrong.body.includes("ADAPTER_INGEST_TOKEN_INVALID") &&
        calls === 0,
      "status=" + wrong.status + " calls=" + calls,
    );
    const okRes = await httpPost(
      port,
      { "x-adapter-token": TOKEN },
      { adapterId: "ebay", dryRun: true },
    );
    record(
      "correct token -> HTTP 2xx and ingest called",
      okRes.status >= 200 && okRes.status < 300 && calls === 1,
      "status=" + okRes.status + " calls=" + calls,
    );
  } finally {
    delete process.env.ADAPTER_INGEST_TOKEN;
    try {
      await closeSelftestApp(app);
    } finally {
      if (typeof uninstall === "function") uninstall();
      if (fs.existsSync(tmpDir)) {
        fs.rmSync(tmpDir, { recursive: true, force: true });
      }
    }
  }

  for (const r of results) {
    console.log((r.ok ? "PASS" : "FAIL") + " " + r.name + " (" + r.detail + ")");
  }
  if (results.some((r) => !r.ok) || results.length !== 4) {
    console.error("[catalog-external-write.ingest-http] FAIL");
    process.exit(1);
  }
  console.log("[catalog-external-write.ingest-http] ALL PASS");
}

main().catch((err) => {
  if (typeof uninstall === "function") uninstall();
  if (fs.existsSync(tmpDir)) {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
  console.error("[catalog-external-write.ingest-http] FAIL");
  console.error(err instanceof Error ? err.stack : String(err));
  process.exit(1);
});
