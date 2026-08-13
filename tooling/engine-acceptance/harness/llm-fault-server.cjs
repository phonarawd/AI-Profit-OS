/**
 * Harness-local OpenAI-compatible LLM fault server.
 * 제품 LLM_BASE_URL 로만 가리킨다. 제품 fault API 없음.
 */
"use strict";

const http = require("node:http");

const HEALTHY_BODY = JSON.stringify({
  id: "qa-synth-chatcmpl",
  object: "chat.completion",
  choices: [
    {
      index: 0,
      message: { role: "assistant", content: "qa-synth-llm-ok" },
      finish_reason: "stop",
    },
  ],
});

function classifyPath(url) {
  const u = String(url || "");
  return u.includes("/chat/completions") || u === "/chat/completions";
}

function createLlmFaultServer(opts = {}) {
  let scenario = opts.scenario || "healthy";
  let delayMs = Number(opts.delayMs || 0);
  const port = Number(opts.port || 0);

  const server = http.createServer((req, res) => {
    if (req.method === "GET" && req.url === "/__qa-fault") {
      res.writeHead(200, { "content-type": "application/json" });
      res.end(JSON.stringify({ scenario, delayMs }));
      return;
    }

    const chunks = [];
    req.on("data", (c) => chunks.push(c));
    req.on("end", () => {
      const run = () => {
        if (!classifyPath(req.url)) {
          res.writeHead(404, { "content-type": "application/json" });
          res.end(JSON.stringify({ error: { message: "not_found" } }));
          return;
        }
        if (scenario === "http_429") {
          res.writeHead(429, { "content-type": "application/json" });
          res.end(JSON.stringify({ error: { message: "quota", type: "insufficient_quota" } }));
          return;
        }
        if (scenario === "http_500") {
          res.writeHead(500, { "content-type": "application/json" });
          res.end(JSON.stringify({ error: { message: "upstream_error" } }));
          return;
        }
        if (scenario === "http_503") {
          res.writeHead(503, { "content-type": "application/json" });
          res.end(JSON.stringify({ error: { message: "unavailable" } }));
          return;
        }
        if (scenario === "invalid_json") {
          res.writeHead(200, { "content-type": "application/json" });
          res.end("{not json");
          return;
        }
        if (scenario === "truncated") {
          res.writeHead(200, { "content-type": "application/json" });
          res.end('{"choices":[{"message":{"content":"partial"');
          return;
        }
        if (scenario === "timeout") {
          // 응답을 보내지 않고 연결만 유지 — 클라이언트가 abort
          return;
        }
        res.writeHead(200, { "content-type": "application/json" });
        res.end(HEALTHY_BODY);
      };

      if (scenario === "timeout" || delayMs > 0) {
        const wait = scenario === "timeout" ? Number(opts.timeoutHoldMs || 35_000) : delayMs;
        setTimeout(run, wait);
        return;
      }
      run();
    });
  });

  function listen() {
    return new Promise((resolve) => {
      server.listen(port, "127.0.0.1", () => {
        const addr = server.address();
        resolve(addr && typeof addr === "object" ? addr.port : port);
      });
    });
  }

  function close() {
    return new Promise((resolve) => server.close(() => resolve()));
  }

  return {
    server,
    listen,
    close,
    setScenario(next, extra = {}) {
      scenario = next;
      if (extra.delayMs != null) delayMs = Number(extra.delayMs);
    },
    getScenario() {
      return scenario;
    },
    address() {
      return server.address();
    },
  };
}

module.exports = {
  createLlmFaultServer,
  HEALTHY_BODY,
};
