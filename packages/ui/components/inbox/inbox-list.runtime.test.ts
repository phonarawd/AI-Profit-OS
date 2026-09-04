import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  classifyInboxHttp,
  parseInboxList,
} from "./inbox-list-state.ts";

const VALID_ITEM = {
  id: "qa-inbox-1",
  channel: "notice",
  titleKo: "안내",
  bodyKo: "계정 알림 예시",
  createdAt: "2026-08-21T00:00:00.000Z",
  readAt: null,
};

describe("inbox list fail-closed read", () => {
  it("accepts a valid empty list as ready authority", () => {
    assert.deepEqual(parseInboxList({ items: [] }), { items: [] });
  });
  it("accepts a complete item including explicit false-like null readAt", () => {
    assert.deepEqual(parseInboxList({ items: [VALID_ITEM] }), {
      items: [VALID_ITEM],
    });
  });
  it("rejects empty object", () => {
    assert.equal(parseInboxList({}), null);
  });
  it("rejects null body", () => {
    assert.equal(parseInboxList(null), null);
  });
  it("rejects items null", () => {
    assert.equal(parseInboxList({ items: null }), null);
  });
  it("rejects items object", () => {
    assert.equal(parseInboxList({ items: {} }), null);
  });
  it("rejects wrong item shape", () => {
    assert.equal(parseInboxList({ items: [{ id: "x" }] }), null);
  });
  it("rejects wrong types", () => {
    assert.equal(
      parseInboxList({
        items: [{ ...VALID_ITEM, titleKo: 1 }],
      }),
      null,
    );
    assert.equal(
      parseInboxList({
        items: [{ ...VALID_ITEM, channel: "all" }],
      }),
      null,
    );
  });
  it("one malformed item poisons the whole list", () => {
    assert.equal(
      parseInboxList({ items: [VALID_ITEM, { id: "bad" }] }),
      null,
    );
  });
  it("classifies 401/403 as unauthorized and 5xx as unavailable", () => {
    assert.equal(classifyInboxHttp(401), "unauthorized");
    assert.equal(classifyInboxHttp(403), "unauthorized");
    assert.equal(classifyInboxHttp(500), "unavailable");
    assert.equal(classifyInboxHttp(503), "unavailable");
  });
});
