/**
 * 격리 Nest HTTP — AdaptersIngestController + mock AdaptersAdminService.
 * 컴파일은 operator-row-protect가 컨트롤러 의존 그래프를 잘라 수행한다.
 */
import "reflect-metadata";
import { Module } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import type { NestExpressApplication } from "@nestjs/platform-express";
import * as http from "node:http";
import { AdaptersIngestController } from "../adapters/adapters.ingest.controller";
import { AdaptersAdminService } from "../adapters/adapters.admin.service";

const TOKEN = "change_me_adapter_ingest_runtime";

type CheckResult = { name: string; ok: boolean; detail: string };

function httpPost(
  port: number,
  headers: Record<string, string>,
  body: unknown,
): Promise<{ status: number; body: string }> {
  return new Promise((resolve, reject) => {
    const payload = Buffer.from(JSON.stringify(body));
    const r = http.request(
      {
        host: "127.0.0.1",
        port,
        path: "/internal/adapters/ingest",
        method: "POST",
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
        res.on("end", () =>
          resolve({ status: res.statusCode ?? 0, body: data }),
        );
      },
    );
    r.on("error", reject);
    r.write(payload);
    r.end();
  });
}

async function main(): Promise<void> {
  console.log("http-selftest: main");
  let calls = 0;
  const mockService = {
    ingest: async (body: { adapterId?: string }) => {
      calls += 1;
      return { ok: true, adapterId: body.adapterId ?? "", accepted: 0 };
    },
  };

  @Module({
    controllers: [AdaptersIngestController],
    providers: [
      { provide: AdaptersAdminService, useValue: mockService },
    ],
  })
  class SelfTestModule {}

  const app = await NestFactory.create<NestExpressApplication>(SelfTestModule, {
    logger: false,
  });
  await app.listen(0);
  const address = app.getHttpServer().address();
  const port = typeof address === "object" && address ? address.port : 0;
  const results: CheckResult[] = [];
  const record = (name: string, ok: boolean, detail: string) =>
    results.push({ name, ok, detail });

  try {
    delete process.env.ADAPTER_INGEST_TOKEN;
    const unset = await httpPost(port, {}, { adapterId: "ebay", dryRun: true });
    record(
      "unset token -> HTTP 503",
      unset.status === 503 &&
        unset.body.includes("ADAPTER_INGEST_TOKEN_NOT_CONFIGURED") &&
        calls === 0,
      `status=${unset.status} calls=${calls}`,
    );

    process.env.ADAPTER_INGEST_TOKEN = TOKEN;
    const missing = await httpPost(
      port,
      {},
      { adapterId: "ebay", dryRun: true },
    );
    record(
      "missing header -> HTTP 401",
      missing.status === 401 &&
        missing.body.includes("ADAPTER_INGEST_TOKEN_INVALID") &&
        calls === 0,
      `status=${missing.status} calls=${calls}`,
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
      `status=${wrong.status} calls=${calls}`,
    );

    const okRes = await httpPost(
      port,
      { "x-adapter-token": TOKEN },
      { adapterId: "ebay", dryRun: true },
    );
    record(
      "correct token -> HTTP 200 and ingest called",
      okRes.status === 200 && calls === 1,
      `status=${okRes.status} calls=${calls}`,
    );
  } finally {
    delete process.env.ADAPTER_INGEST_TOKEN;
    await app.close();
  }

  const failed = results.filter((r) => !r.ok);
  for (const r of results) {
    console.log(`${r.ok ? "PASS" : "FAIL"} ${r.name} (${r.detail})`);
  }
  if (failed.length) {
    console.error("[catalog-external-write.ingest-http] FAIL");
    process.exit(1);
  }
  console.log("[catalog-external-write.ingest-http] ALL PASS");
}

main().catch((err) => {
  console.error("[catalog-external-write.ingest-http] FAIL");
  console.error(err instanceof Error ? err.message : "boot failed");
  process.exit(1);
});
