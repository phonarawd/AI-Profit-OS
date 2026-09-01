import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  createPeotteokSseState,
  feedPeotteokSse,
  finishPeotteokSse,
} from "./sse-consume.ts";

function collect() {
  const chunks = [];
  const dones = [];
  const errors = [];
  const flags = { aborted: false };
  return {
    chunks,
    dones,
    errors,
    flags,
    handlers: {
      onChunk: (t) => {
        chunks.push(t);
      },
      onDone: (d) => {
        dones.push(d);
      },
      onError: (e) => {
        errors.push(e.message);
      },
      onAbort: () => {
        flags.aborted = true;
      },
    },
  };
}

const DONE = ["event: done", 'data: {"answer_text":"ok"}', "", ""].join("\n");
const CHUNK = ["event: chunk", 'data: {"text":"part"}', "", ""].join("\n");
const META = ["event: meta", 'data: {"lane":"P"}', "", ""].join("\n");
const ERR = ["event: error", 'data: {"message":"upstream"}', "", ""].join("\n");
const TRAIL_DONE = ["event: done", 'data: {"answer_text":"end"}'].join("\n");
const BAD_TRAIL = ["event: done", "data: not-json"].join("\n");

describe("peotteok SSE consume", () => {
  it("accepts normal meta/chunk/done", () => {
    const s = createPeotteokSseState();
    const c = collect();
    feedPeotteokSse(s, META + CHUNK + DONE, c.handlers);
    assert.deepEqual(c.chunks, ["part"]);
    assert.equal(c.dones.length, 1);
    assert.equal(c.errors.length, 0);
  });

  it("EOF after chunk without done fails closed", () => {
    const s = createPeotteokSseState();
    const c = collect();
    feedPeotteokSse(s, CHUNK, c.handlers);
    finishPeotteokSse(s, c.handlers, "eof");
    assert.deepEqual(c.chunks, ["part"]);
    assert.equal(c.dones.length, 0);
    assert.equal(c.errors[0], "peotteok_sse_eof_without_done");
  });

  it("immediate EOF without events fails closed", () => {
    const s = createPeotteokSseState();
    const c = collect();
    finishPeotteokSse(s, c.handlers, "eof");
    assert.equal(c.dones.length, 0);
    assert.equal(c.errors[0], "peotteok_sse_eof_without_done");
  });

  it("protocol error event does not invent done", () => {
    const s = createPeotteokSseState();
    const c = collect();
    feedPeotteokSse(s, ERR, c.handlers);
    finishPeotteokSse(s, c.handlers, "eof");
    assert.equal(c.dones.length, 0);
    assert.equal(c.errors[0], "upstream");
  });

  it("abort releases without inventing an answer", () => {
    const s = createPeotteokSseState();
    const c = collect();
    feedPeotteokSse(s, CHUNK, c.handlers);
    finishPeotteokSse(s, c.handlers, "abort");
    assert.equal(c.flags.aborted, true);
    assert.equal(c.dones.length, 0);
    assert.equal(c.errors.length, 0);
  });

  it("processes a complete trailing done event", () => {
    const s = createPeotteokSseState();
    const c = collect();
    feedPeotteokSse(s, CHUNK, c.handlers);
    feedPeotteokSse(s, TRAIL_DONE, c.handlers);
    finishPeotteokSse(s, c.handlers, "eof");
    assert.equal(c.dones.length, 1);
    assert.equal(c.errors.length, 0);
  });

  it("malformed trailing data fails closed", () => {
    const s = createPeotteokSseState();
    const c = collect();
    feedPeotteokSse(s, BAD_TRAIL, c.handlers);
    finishPeotteokSse(s, c.handlers, "eof");
    assert.equal(c.dones.length, 0);
    assert.equal(c.errors[0], "peotteok_sse_malformed_trailing");
  });
});
