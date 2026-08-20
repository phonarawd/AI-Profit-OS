import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  InboxError,
  normalizeInboxList,
  normalizeNotificationPrefs,
} from "./fetch.ts";

describe("inbox gap wiring — empty is truth · missing prefs not invented", () => {
  it("treats a missing items array as an empty list, not synthetic cards", () => {
    const out = normalizeInboxList({});
    assert.deepEqual(out.items, []);
  });

  it("drops inbox rows that lack id/title instead of filling them", () => {
    const out = normalizeInboxList({
      items: [
        { id: "m1", titleKo: "입금 확인", createdAt: "2026-08-20T00:00:00.000Z" },
        { titleKo: "가짜" },
      ],
    });
    assert.equal(out.items.length, 1);
    assert.equal(out.items[0]?.id, "m1");
  });

  it("does not invent notification prefs when a channel is missing", () => {
    assert.throws(
      () =>
        normalizeNotificationPrefs({
          userId: "u1",
          master: true,
          opportunity: true,
        }),
      InboxError,
    );
  });
});
