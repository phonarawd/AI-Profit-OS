import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { parseStoredUxPrefs, parseUxPrefsPatch } from "./user-ux-prefs.parse.ts";
import {
  UxPrefsUnavailableError,
  readUxPrefsForUser,
} from "./user-ux-prefs.store.ts";

const STORED = {
  userId: "11111111-1111-1111-1111-111111111111",
  toneBand: "senior",
  fontScale: "xl",
  depositPref: "krw",
  updatedAt: "2026-09-01T00:00:00.000Z",
} as const;

describe("ux-prefs fail-closed parse", () => {
  it("accepts a single valid field and ignores echoed userId", () => {
    assert.deepEqual(
      parseUxPrefsPatch({
        userId: "attacker",
        updatedAt: "2099-01-01T00:00:00.000Z",
        fontScale: "lg",
      }),
      { fontScale: "lg" },
    );
  });

  it("rejects unknown keys", () => {
    assert.deepEqual(parseUxPrefsPatch({ fontScale: "lg", theme: "light" }), {
      error: "UX_PREFS_MALFORMED",
    });
  });

  it("rejects invalid enums", () => {
    assert.deepEqual(parseUxPrefsPatch({ fontScale: "sm" }), {
      error: "UX_PREFS_MALFORMED",
    });
    assert.deepEqual(parseUxPrefsPatch({ toneBand: "MID" }), {
      error: "UX_PREFS_MALFORMED",
    });
    assert.deepEqual(parseUxPrefsPatch({ depositPref: "btc" }), {
      error: "UX_PREFS_MALFORMED",
    });
  });

  it("rejects empty / non-object bodies", () => {
    assert.deepEqual(parseUxPrefsPatch({}), { error: "UX_PREFS_MALFORMED" });
    assert.deepEqual(parseUxPrefsPatch(null), { error: "UX_PREFS_MALFORMED" });
    assert.deepEqual(parseUxPrefsPatch([]), { error: "UX_PREFS_MALFORMED" });
  });

  it("stored parse requires canonical fields and matching user", () => {
    assert.deepEqual(parseStoredUxPrefs(STORED, STORED.userId), STORED);
    assert.equal(parseStoredUxPrefs({ ...STORED, fontScale: "huge" }), null);
    assert.equal(parseStoredUxPrefs({ ...STORED, userId: "other" }, STORED.userId), null);
    assert.equal(parseStoredUxPrefs({ toneBand: "mid", fontScale: "md" }), null);
  });
});

describe("ux-prefs store fail-closed DB", () => {
  it("does not invent defaults when SELECT throws", async () => {
    await assert.rejects(
      () =>
        readUxPrefsForUser(
          {
            query: async () => {
              throw new Error("ECONNREFUSED 127.0.0.1");
            },
          },
          STORED.userId,
        ),
      (err: unknown) => err instanceof UxPrefsUnavailableError,
    );
  });

  it("does not invent defaults when the row is missing after ensure", async () => {
    await assert.rejects(
      () =>
        readUxPrefsForUser(
          {
            query: async () => ({ rows: [], rowCount: 0 }),
          },
          STORED.userId,
        ),
      (err: unknown) => err instanceof UxPrefsUnavailableError,
    );
  });

  it("returns the stored row and never a caller userId override", async () => {
    const got = await readUxPrefsForUser(
      {
        query: async (sql: string) => {
          if (String(sql).includes("INSERT")) return { rows: [], rowCount: 0 };
          return {
            rows: [
              {
                user_id: STORED.userId,
                tone_band: "young",
                font_scale: "lg",
                deposit_pref: "krw",
                updated_at: new Date(STORED.updatedAt),
              },
            ],
            rowCount: 1,
          };
        },
      },
      STORED.userId,
    );
    assert.equal(got.userId, STORED.userId);
    assert.equal(got.toneBand, "young");
    assert.equal(got.fontScale, "lg");
    assert.equal(got.depositPref, "krw");
  });
});
