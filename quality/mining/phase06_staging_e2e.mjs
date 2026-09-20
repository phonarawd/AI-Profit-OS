import { createServer } from "node:http";

createServer((_req, res) => {
  res.statusCode = 200;
  res.end("PHASE07_GATE_VERIFIER");
}).listen(Number(process.env.PORT || 10000));
