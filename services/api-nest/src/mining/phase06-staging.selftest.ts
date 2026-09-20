import { createHmac, randomUUID } from "node:crypto";
import { PostgresService } from "../db/postgres";

type JsonObject = Record<string, unknown>;

type RequestResult = {
  status: number;
  data: JsonObject | string | null;
};

function base64url(value: string | Buffer): string {
  return Buffer.from(value)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function signAdmin(secret: string, adminId: string): string {
  const now = Math.floor(Date.now() / 1000);
  const header = base64url(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const payload = base64url(JSON.stringify({
    sub: adminId,
    role: "super",
    iss: "ai-profit-os-admin",
    aud: "aipo-ops",
    iat: now,
    exp: now + 15 * 60,
    jti: randomUUID(),
  }));
  const signingInput = `${header}.${payload}`;
  const signature = createHmac("sha256", secret).update(signingInput).digest();
  return `${signingInput}.${base64url(signature)}`;
}

function objectData(result: RequestResult): JsonObject {
  if (!result.data || typeof result.data !== "object" || Array.isArray(result.data)) {
    throw new Error("expected JSON object response");
  }
  return result.data;
}

function textField(data: JsonObject, key: string): string {
  const value = data[key];
  return typeof value === "string" ? value : "";
}

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

async function request(
  baseUrl: string,
  method: string,
  path: string,
  token: string,
  body?: JsonObject,
  expected: number[] = [200, 201],
): Promise<RequestResult> {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
    Accept: "application/json",
  };
  if (body !== undefined) {
    headers["Content-Type"] = "application/json";
    headers["Idempotency-Key"] = `phase06-${randomUUID()}`;
  }
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await response.text();
  let data: JsonObject | string | null = null;
  if (text) {
    try {
      data = JSON.parse(text) as JsonObject;
    } catch {
      data = text;
    }
  }
  if (!expected.includes(response.status)) {
    throw new Error(`${method} ${path} expected ${expected.join("/")} but got ${response.status}: ${typeof data === "string" ? data : JSON.stringify(data)}`);
  }
  return { status: response.status, data };
}

export async function runPhase06StagingSelftest(port: number): Promise<void> {
  if (process.env.PHASE06_STAGING_SELFTEST !== "1") return;

  const expectedRef = "mgsytcetsiecllmhcyox";
  const configuredRef = String(process.env.SUPABASE_PROJECT_REF ?? "").trim();
  const databaseUrl = String(process.env.DATABASE_URL ?? "");
  const targetMatches = configuredRef === expectedRef || databaseUrl.includes(expectedRef);
  assert(targetMatches, "PHASE06 self-test refused: staging Supabase target mismatch");

  const secret = String(process.env.JWT_ADMIN_SECRET ?? "");
  assert(secret.length >= 32, "PHASE06 self-test refused: JWT_ADMIN_SECRET missing");

  const db = new PostgresService();
  const admins = await db.query<{ admin_id: string }>(
    `SELECT admin_id::text AS admin_id
       FROM public.admin_rbac
      ORDER BY admin_id
      LIMIT 2`,
  );
  assert(admins.rows.length >= 2, `PHASE06 self-test needs 2 admin_rbac rows, found ${admins.rows.length}`);

  const makerId = admins.rows[0]!.admin_id;
  const checkerId = admins.rows[1]!.admin_id;
  assert(makerId !== checkerId, "PHASE06 maker/checker ids are not distinct");

  const makerToken = signAdmin(secret, makerId);
  const checkerToken = signAdmin(secret, checkerId);
  const baseUrl = `http://127.0.0.1:${port}`;
  const suffix = `${Date.now().toString(36)}${randomUUID().replaceAll("-", "").slice(0, 6)}`.toUpperCase();
  const code = `E2E_${suffix}`.slice(0, 60);
  const reason = "PHASE06 격리 staging maker checker 검증입니다.";

  let mineId = "";
  let rateVersionId = "";

  console.log("PHASE06_STAGING_E2E_START", { projectRef: expectedRef, code });

  const createdMine = objectData(await request(baseUrl, "POST", "/api/v1/admin/mines", makerToken, {
    code,
    displayName: `PHASE06 E2E ${suffix.slice(-6)}`,
    description: "PHASE06 staging 전용 검증 광산",
    assetCode: "XAU",
    minPrincipalAmount: "10",
    maxPrincipalAmount: "1000",
    displayOrder: 999999,
    reason,
  }));
  mineId = textField(createdMine, "mineId");
  assert(mineId, "mineId missing after create");
  assert(textField(createdMine, "status") === "READY", `expected READY mine, got ${textField(createdMine, "status")}`);
  console.log("PASS mine create", mineId);

  const createdRate = objectData(await request(baseUrl, "POST", `/api/v1/admin/mines/${encodeURIComponent(mineId)}/rates`, makerToken, {
    dailyRate: "0.001",
    reason,
  }));
  rateVersionId = textField(createdRate, "rateVersionId");
  assert(rateVersionId, "rateVersionId missing after create");
  assert(textField(createdRate, "status") === "DRAFT", `expected DRAFT rate, got ${textField(createdRate, "status")}`);
  console.log("PASS rate draft", rateVersionId);

  const requested = objectData(await request(baseUrl, "POST", `/api/v1/admin/mines/${encodeURIComponent(mineId)}/rates/${encodeURIComponent(rateVersionId)}/request-approval`, makerToken, { reason }));
  assert(textField(requested, "status") === "APPROVAL_PENDING", `expected APPROVAL_PENDING, got ${textField(requested, "status")}`);
  console.log("PASS approval request");

  const selfApproval = await request(
    baseUrl,
    "POST",
    `/api/v1/admin/mines/${encodeURIComponent(mineId)}/rates/${encodeURIComponent(rateVersionId)}/approve`,
    makerToken,
    { reason },
    [409],
  );
  console.log("PASS maker self-approval rejected", selfApproval.status);

  const approved = objectData(await request(baseUrl, "POST", `/api/v1/admin/mines/${encodeURIComponent(mineId)}/rates/${encodeURIComponent(rateVersionId)}/approve`, checkerToken, { reason }));
  assert(Boolean(approved.approvedAt), "approvedAt missing after checker approval");
  assert(textField(approved, "approvedByAdminId") === checkerId, "checker identity was not persisted as approver");
  console.log("PASS checker approval");

  const activated = objectData(await request(baseUrl, "POST", `/api/v1/admin/mines/${encodeURIComponent(mineId)}/rates/${encodeURIComponent(rateVersionId)}/schedule`, makerToken, {
    effectiveAt: new Date(Date.now() - 1000).toISOString(),
    reason,
  }));
  assert(textField(activated, "status") === "ACTIVE", `expected ACTIVE rate, got ${textField(activated, "status")}`);
  console.log("PASS rate activation");

  const published = objectData(await request(baseUrl, "POST", `/api/v1/admin/mines/${encodeURIComponent(mineId)}/publish`, makerToken, { reason }));
  assert(textField(published, "status") === "ACTIVE", `expected ACTIVE mine, got ${textField(published, "status")}`);
  console.log("PASS mine publish");

  const readback = objectData(await request(baseUrl, "GET", `/api/v1/admin/mines/${encodeURIComponent(mineId)}`, makerToken));
  assert(textField(readback, "status") === "ACTIVE", `mine readback mismatch: ${textField(readback, "status")}`);
  const rateVersions = Array.isArray(readback.rateVersions) ? readback.rateVersions : [];
  const readRate = rateVersions.find((row) => {
    if (!row || typeof row !== "object" || Array.isArray(row)) return false;
    return textField(row as JsonObject, "rateVersionId") === rateVersionId;
  });
  assert(readRate && typeof readRate === "object" && !Array.isArray(readRate), "active rate missing on readback");
  const readRateObject = readRate as JsonObject;
  assert(textField(readRateObject, "status") === "ACTIVE", `rate readback mismatch: ${textField(readRateObject, "status")}`);
  assert(textField(readRateObject, "approvedByAdminId") === checkerId, "rate readback checker identity mismatch");
  console.log("PASS active readback");

  const ended = objectData(await request(baseUrl, "POST", `/api/v1/admin/mines/${encodeURIComponent(mineId)}/end`, makerToken, { reason }));
  assert(textField(ended, "status") === "ENDED", `expected ENDED cleanup state, got ${textField(ended, "status")}`);
  console.log("PASS staging cleanup end");

  console.log("PHASE06_STAGING_E2E_PASS", {
    mineId,
    rateVersionId,
    makerCheckerSeparated: true,
    finalMineStatus: textField(ended, "status"),
  });

  await db.onModuleDestroy();
}
