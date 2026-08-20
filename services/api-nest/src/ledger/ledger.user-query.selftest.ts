/**
 * REL-015 — 유저 원장 조회 Nest HTTP.
 * AppModule에 연결하지 않는다. 프로덕션 DB 0.
 */
import "reflect-metadata";
import {
  CanActivate,
  Controller,
  ExecutionContext,
  ForbiddenException,
  Get,
  Injectable,
  Module,
  Param,
  Query,
  Req,
  UnauthorizedException,
  UseGuards,
} from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import type { NestExpressApplication } from "@nestjs/platform-express";
import * as http from "node:http";
import { createRequire } from "node:module";
import { join } from "node:path";
import { LedgerUserController } from "./ledger.user.controller";

const req = createRequire(__filename);
const core = req(join(__dirname, "..", "..", "ledger-user-query.core.cjs")) as {
  FORBIDDEN_KO: string;
  listJournalsForUser: (
    store: unknown,
    userId: string,
    paging: { limit?: string; offset?: string },
  ) => {
    status: number;
    items?: unknown[];
    total?: number;
    limit?: number;
    offset?: number;
  };
  getJournalForUser: (
    store: unknown,
    userId: string,
    journalId: string,
  ) => { status: number; journal?: unknown; messageKo?: string };
  fixtureStore: () => unknown;
};

@Injectable()
class ProbeAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const httpReq = context.switchToHttp().getRequest<{
      headers?: Record<string, string | undefined>;
      user?: { userId: string; sub: string };
    }>();
    const userId = httpReq.headers?.["x-test-user"];
    if (!userId) {
      throw new UnauthorizedException("AUTH_REQUIRED");
    }
    httpReq.user = { userId, sub: userId };
    return true;
  }
}

@Controller("me/ledger")
@UseGuards(ProbeAuthGuard)
class ProbeController {
  private readonly store = core.fixtureStore();

  @Get("journals")
  list(
    @Req() request: { user?: { userId?: string } },
    @Query("limit") limit?: string,
    @Query("offset") offset?: string,
  ) {
    const userId = String(request.user?.userId ?? "");
    const result = core.listJournalsForUser(this.store, userId, {
      limit,
      offset,
    });
    if (result.status === 401) {
      throw new UnauthorizedException("AUTH_REQUIRED");
    }
    return {
      items: result.items,
      total: result.total,
      limit: result.limit,
      offset: result.offset,
    };
  }

  @Get("journals/:journalId")
  get(
    @Req() request: { user?: { userId?: string } },
    @Param("journalId") journalId: string,
  ) {
    const userId = String(request.user?.userId ?? "");
    const result = core.getJournalForUser(this.store, userId, journalId);
    if (result.status === 401) {
      throw new UnauthorizedException("AUTH_REQUIRED");
    }
    if (result.status === 403) {
      throw new ForbiddenException(core.FORBIDDEN_KO);
    }
    return result.journal;
  }
}

@Module({
  controllers: [ProbeController],
  providers: [ProbeAuthGuard],
})
class SelfTestModule {}

function httpReq(
  port: number,
  path: string,
  user?: string,
): Promise<{ status: number; body: string }> {
  return new Promise((resolve, reject) => {
    const headers: Record<string, string> = {};
    if (user) headers["x-test-user"] = user;
    const r = http.request(
      {
        host: "127.0.0.1",
        port,
        path,
        method: "GET",
        headers,
      },
      (res) => {
        let data = "";
        res.on("data", (chunk) => (data += chunk));
        res.on("end", () =>
          resolve({ status: res.statusCode ?? 0, body: data }),
        );
      },
    );
    r.on("error", reject);
    r.end();
  });
}

async function main(): Promise<void> {
  const store = core.fixtureStore();
  const empty = core.listJournalsForUser({ journals: [] }, "user-a", {});
  if (empty.status !== 200 || empty.total !== 0 || empty.items?.length !== 0) {
    throw new Error("empty list must be 200 items=[]");
  }

  const listed = core.listJournalsForUser(store, "user-a", {
    limit: "20",
    offset: "0",
  });
  if (listed.status !== 200 || listed.total !== 1) {
    throw new Error("user-a must see exactly one journal");
  }
  const first = listed.items?.[0] as {
    entries: { amountUsdt: string; ownerUserId?: string }[];
  };
  if (typeof first.entries[0].amountUsdt !== "string") {
    throw new Error("amountUsdt must stay a decimal string");
  }
  if (first.entries.some((e) => e.ownerUserId === "user-b")) {
    throw new Error("foreign account lines must be redacted");
  }

  const other = core.getJournalForUser(store, "user-a", "j-other");
  if (other.status !== 403) {
    throw new Error("foreign journal must be 403");
  }

  const app = await NestFactory.create<NestExpressApplication>(SelfTestModule, {
    logger: false,
  });
  await app.listen(0);
  const address = app.getHttpServer().address();
  const port = typeof address === "object" && address ? address.port : 0;

  try {
    const unauth = await httpReq(port, "/me/ledger/journals");
    if (unauth.status !== 401) {
      throw new Error(`expected 401 without user, got ${unauth.status}`);
    }
    const ok = await httpReq(port, "/me/ledger/journals", "user-a");
    if (ok.status !== 200) {
      throw new Error(`expected 200 list, got ${ok.status} ${ok.body}`);
    }
    const parsed = JSON.parse(ok.body) as { items: unknown[]; total: number };
    if (parsed.total !== 1 || parsed.items.length !== 1) {
      throw new Error("HTTP list must return the caller journal only");
    }
    const forbidden = await httpReq(
      port,
      "/me/ledger/journals/j-other",
      "user-a",
    );
    if (forbidden.status !== 403) {
      throw new Error(`expected 403, got ${forbidden.status} ${forbidden.body}`);
    }
  } finally {
    await app.close();
  }

  void LedgerUserController;
  console.log("[ledger-user-query.selftest] ALL PASS");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
