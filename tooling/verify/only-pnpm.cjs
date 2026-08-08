/** ADR-015 — block npm/yarn/bun as install SSOT */
const ua = process.env.npm_config_user_agent || "";
if (!ua.includes("pnpm")) {
  console.error(
    "[ADR-015] Use pnpm only. npm/yarn/bun install is forbidden.\n" +
      "  corepack enable && corepack prepare pnpm@10.14.0 --activate\n" +
      "  pnpm install"
  );
  process.exit(1);
}
