import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  classifyPrefsHttp,
  createPrefsWriteController,
  parseNotificationPrefs,
  type NotifyPrefs,
} from "./notification-prefs-state.ts";

const ALL_TRUE: NotifyPrefs = {
  master: true,
  opportunity: true,
  wallet: true,
  notice: true,
  campaign: true,
  opsMessage: true,
  strategyMatch: true,
};

const ONE_FALSE: NotifyPrefs = { ...ALL_TRUE, campaign: false };

describe("notification prefs fail-closed read", () => {
  it("accepts a complete boolean payload including explicit false", () => {
    assert.deepEqual(parseNotificationPrefs(ONE_FALSE), ONE_FALSE);
  });
  it("rejects empty object", () => {
    assert.equal(parseNotificationPrefs({}), null);
  });
  it("rejects null body", () => {
    assert.equal(parseNotificationPrefs(null), null);
  });
  it("rejects missing field", () => {
    const { campaign: _drop, ...rest } = ALL_TRUE;
    void _drop;
    assert.equal(parseNotificationPrefs(rest), null);
  });
  it("rejects null field", () => {
    assert.equal(parseNotificationPrefs({ ...ALL_TRUE, master: null }), null);
  });
  it("rejects string true", () => {
    assert.equal(parseNotificationPrefs({ ...ALL_TRUE, master: "true" }), null);
  });
  it("rejects numeric 1", () => {
    assert.equal(parseNotificationPrefs({ ...ALL_TRUE, master: 1 }), null);
  });
  it("rejects object/array", () => {
    assert.equal(parseNotificationPrefs([]), null);
    assert.equal(parseNotificationPrefs({ prefs: ALL_TRUE }), null);
  });
  it("classifies 401/403 as unauthorized and 5xx as unavailable", () => {
    assert.equal(classifyPrefsHttp(401), "unauthorized");
    assert.equal(classifyPrefsHttp(403), "unauthorized");
    assert.equal(classifyPrefsHttp(500), "unavailable");
    assert.equal(classifyPrefsHttp(503), "unavailable");
  });
});

describe("notification prefs write queue", () => {
  it("keeps one in-flight write and only the latest queued intent", async () => {
    const calls: NotifyPrefs[] = [];
    let release!: (v: { ok: true; body: unknown }) => void;
    const first = new Promise<{ ok: true; body: unknown }>((resolve) => {
      release = resolve;
    });
    let step = 0;
    const confirmed: NotifyPrefs[] = [];
    const rolled: NotifyPrefs[] = [];
    const ctl = createPrefsWriteController({
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
    ctl.setConfirmed(ALL_TRUE);
    const p1 = ctl.submit({ ...ALL_TRUE, notice: false });
    const p2 = ctl.submit({ ...ALL_TRUE, notice: false, campaign: false });
    const p3 = ctl.submit(ONE_FALSE);
    assert.equal(await p2, "queued");
    assert.equal(await p3, "queued");
    release({ ok: true, body: { ...ALL_TRUE, notice: false } });
    assert.equal(await p1, "ok");
    assert.equal(calls.length, 2);
    assert.deepEqual(calls[1], ONE_FALSE);
    assert.deepEqual(confirmed.at(-1), ONE_FALSE);
    assert.equal(rolled.length, 0);
  });

  it("rolls back to last confirmed snapshot on failure", async () => {
    const rolled: NotifyPrefs[] = [];
    const ctl = createPrefsWriteController({
      put: async () => ({ ok: false }),
      onConfirmed: () => {},
      onRollback: (p) => rolled.push(p),
    });
    ctl.setConfirmed(ONE_FALSE);
    const out = await ctl.submit(ALL_TRUE);
    assert.equal(out, "failed");
    assert.deepEqual(rolled, [ONE_FALSE]);
  });

  it("skips a write that matches the last confirmed snapshot", async () => {
    let puts = 0;
    const ctl = createPrefsWriteController({
      put: async (prefs) => {
        puts += 1;
        return { ok: true, body: prefs };
      },
      onConfirmed: () => {},
      onRollback: () => {},
    });
    ctl.setConfirmed(ONE_FALSE);
    assert.equal(await ctl.submit(ONE_FALSE), "skipped");
    assert.equal(puts, 0);
  });
});
