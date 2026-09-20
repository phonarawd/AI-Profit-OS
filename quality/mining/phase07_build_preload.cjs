const { execFileSync } = require("node:child_process");

if (process.env.PHASE07_PRELOAD_RUNNING !== "1") {
  const expected = "61fe6a6aa4c5ecc57c18b1937f6738111330c6b4";
  const dir = "/tmp/putduk-web-phase07-build";
  const command = `
set -eu
rm -rf ${dir}
git clone --quiet https://github.com/phonarawd/putduk-web.git ${dir}
cd ${dir}
git checkout --quiet --detach ${expected}
ACTUAL=$(git rev-parse HEAD)
echo PHASE07_VERIFY_HEAD=$ACTUAL
test "$ACTUAL" = "${expected}"
corepack enable
corepack prepare pnpm@11.4.0 --activate
pnpm --version
pnpm install --frozen-lockfile
node quality/mining/phase07_web_state_assertions.mjs
pnpm exec tsc --noEmit
pnpm lint
pnpm test
pnpm build
echo PHASE07_VERIFY_OK
`;
  execFileSync("bash", ["-lc", command], {
    stdio: "inherit",
    env: {
      ...process.env,
      NODE_OPTIONS: "",
      PHASE07_PRELOAD_RUNNING: "1",
    },
  });
}
