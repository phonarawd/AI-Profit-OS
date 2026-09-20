import { execFileSync } from "node:child_process";
import { createServer } from "node:http";

const expected = "61fe6a6aa4c5ecc57c18b1937f6738111330c6b4";
const dir = "/tmp/putduk-web-phase07";
const command = `
set -eu
export NODE_OPTIONS=--max-old-space-size=256
rm -rf ${dir}
git clone --quiet https://github.com/phonarawd/putduk-web.git ${dir}
cd ${dir}
git checkout --quiet --detach ${expected}
ACTUAL=$(git rev-parse HEAD)
echo PHASE07_VERIFY_HEAD=$ACTUAL
test "$ACTUAL" = "${expected}"
corepack pnpm --version
corepack pnpm install --frozen-lockfile --network-concurrency=1 --child-concurrency=1
node quality/mining/phase07_web_state_assertions.mjs
corepack pnpm exec tsc --noEmit
corepack pnpm lint
corepack pnpm test
corepack pnpm build
echo PHASE07_VERIFY_OK
`;

execFileSync("bash", ["-lc", command], { stdio: "inherit" });

createServer((_req, res) => {
  res.statusCode = 200;
  res.end("PHASE07_GATE_VERIFIER");
}).listen(Number(process.env.PORT || 10000));
