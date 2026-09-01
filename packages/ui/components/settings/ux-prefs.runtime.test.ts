import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  createUxPrefsWriteController,
  parseUserUxPrefs,
  resolveDepositTab,
  type UserUxPrefs,
} from "./ux-prefs-state.ts";

const BASE: UserUxPrefs = {
  toneBand: "mid",
  fontScale: "md",
  depositPref: "usdt",
};

describe("ux-prefs fail-closed read", () => {
  it("rejects missing and invalid fields", () => {
    assert.equal(parseUserUxPrefs({}), null);
    assert.equal(parseUserUxPrefs({ ...BASE, fontScale: "sm" }), null);
    assert.equal(parseUserUxPrefs({ toneBand: "mid", fontScale: "md" }), null);
  });
  it("accepts a canonical triple", () => {
    assert.deepEqual(parseUserUxPrefs(BASE), BASE);
  });
});

describe("depositPref priority", () => {
  it("explicit URL wins over stored KRW", () => {
    assert.deepEqual(
      resolveDepositTab({ urlTab: "usdt", stored: "krw", prefsView: "ready" }),
      { tab: "usdt", source: "url" },
    );
  });
  it("explicit KRW wins over stored USDT", () => {
    assert.deepEqual(
      resolveDepositTab({ urlTab: "krw", stored: "usdt", prefsView: "ready" }),
      { tab: "krw", source: "url" },
    );
  });
  it("no query uses stored pref", () => {
    assert.deepEqual(
      resolveDepositTab({ urlTab: null, stored: "krw", prefsView: "ready" }),
      { tab: "krw", source: "pref" },
    );
  });
  it("unavailable prefs safely use USDT", () => {
    assert.deepEqual(
      resolveDepositTab({ urlTab: null, stored: "krw", prefsView: "unavailable" }),
      { tab: "usdt", source: "default" },
    );
  });
  it("loading is not a confirmed stored default", () => {
    assert.deepEqual(
      resolveDepositTab({ urlTab: null, stored: null, prefsView: "loading" }),
      { tab: "usdt", source: "loading" },
    );
  });
});

describe("ux-prefs latest intent", () => {
  it("A pending then B: late A success does not become authority", async () => {
    const confirmed: UserUxPrefs[] = [];
    const rolled: UserUxPrefs[] = [];
    let releaseA!: (v: { ok: true; body: unknown }) => void;
    const first = new Promise<{ ok: true; body: unknown }>((resolve) => {
      releaseA = resolve;
    });
    let step = 0;
    const calls: UserUxPrefs[] = [];
    const ctl = createUxPrefsWriteController({
      put: async (prefs) => {
        calls.push(prefs);
        if (step === 0) {
          step = 1;
          return first;
        }
        return { ok: true, body: prefs };
      },
      onConfirmed: (p) => confirmed.push(p),
      onRollback: (p) => rolled.push(p),
    });
    ctl.setConfirmed(BASE);
    const a = { ...BASE, fontScale: "lg" as const };
    const b = { ...BASE, fontScale: "xl" as const };
    const p1 = ctl.submit(a);
    const p2 = ctl.submit(b);
    assert.equal(await p2, "queued");
    releaseA({ ok: true, body: a });
    assert.equal(await p1, "ok");
    assert.deepEqual(calls[1], b);
    assert.deepEqual(confirmed.at(-1), b);
    assert.equal(confirmed.some((p) => p.fontScale === "lg"), false);
    assert.equal(rolled.length, 0);
  });

  it("rolls back to last confirmed snapshot on failure", async () => {
    const rolled: UserUxPrefs[] = [];
    const ctl = createUxPrefsWriteController({
      put: async () => ({ ok: false }),
      onConfirmed: () => {},
      onRollback: (p) => rolled.push(p),
    });
    ctl.setConfirmed(BASE);
    assert.equal(await ctl.submit({ ...BASE, depositPref: "krw" }), "failed");
    assert.deepEqual(rolled, [BASE]);
  });
});
