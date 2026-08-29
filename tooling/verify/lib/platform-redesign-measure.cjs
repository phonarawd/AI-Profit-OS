/**
 * R0 Forensic measure — shared by verify:platform-redesign-inventory
 * Paths always canonical `/` (Windows `\`.normalize).
 */
const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const SKIP = new Set([
  "node_modules",
  ".git",
  ".next",
  "dist",
  "target",
  ".wrangler",
  "coverage",
  "playwright-report",
]);

function norm(p) {
  return String(p).replace(/\\/g, "/");
}

function walk(root, dir, pred, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (SKIP.has(e.name)) continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(root, p, pred, out);
    else if (!pred || pred(p)) out.push(norm(path.relative(root, p)));
  }
  return out;
}

function pageToRoute(rel, basePrefix) {
  let r = rel.slice(basePrefix.length).replace(/\/page\.tsx$/, "");
  if (!r) return "/";
  return r.startsWith("/") ? r : `/${r}`;
}

function measure(root) {
  const commitSha = execSync("git rev-parse HEAD", {
    cwd: root,
    encoding: "utf8",
  }).trim();

  const dirtyPaths = execSync("git status --porcelain", {
    cwd: root,
    encoding: "utf8",
  })
    .split(/\r?\n/)
    .filter(Boolean)
    .map((l) => {
      const raw = l.slice(3).trim().replace(/^"|"$/g, "");
      const arrow = raw.includes(" -> ") ? raw.split(" -> ").pop() : raw;
      return norm(arrow);
    })
    .sort();

  const webPages = walk(root, path.join(root, "apps/web/app"), (p) =>
    /page\.tsx$/.test(p),
  ).sort();
  const adminPages = walk(root, path.join(root, "apps/admin/app"), (p) =>
    /page\.tsx$/.test(p),
  ).sort();

  const webPhysicalPages = webPages.map((p) => ({
    logicalRoute: pageToRoute(p, "apps/web/app"),
    physicalPage: p,
  }));
  const adminPhysicalPages = adminPages.map((p) => ({
    logicalRoute: pageToRoute(p, "apps/admin/app"),
    physicalPage: p,
  }));

  const webRoutesSrc = fs.readFileSync(
    path.join(root, "apps/web/routes.ts"),
    "utf8",
  );
  const tabBlock = webRoutesSrc.match(
    /export const USER_TABS\s*=\s*\[([\s\S]*?)\]\s*as const/,
  );
  let userTabs = tabBlock
    ? [...tabBlock[1].matchAll(/href:\s*"([^"]+)"/g)].map((m) => m[1])
    : [];
  if (userTabs.length === 0) {
    if (!webRoutesSrc.includes("USER_TABS")) throw new Error("USER_TABS missing");
    const navSrc = fs.readFileSync(
      path.join(root, "packages/ui/navigation/consumer-navigation.ts"),
      "utf8",
    );
    const dest = {};
    for (const m of navSrc.matchAll(
      /(\w+):\s*\{\s*id:\s*"[^"]+",\s*href:\s*"([^"]+)"/g,
    )) {
      dest[m[1]] = m[2];
    }
    userTabs = [...navSrc.matchAll(/href:\s*CONSUMER_DESTINATIONS\.(\w+)\.href/g)]
      .map((m) => dest[m[1]])
      .filter(Boolean);
  }
  if (userTabs.length === 0) throw new Error("USER_TABS missing");
  const nestedMatch = webRoutesSrc.match(
    /USER_NESTED_ROUTES\s*=\s*\[([\s\S]*?)\]\s*as const/,
  );
  if (!nestedMatch) throw new Error("USER_NESTED_ROUTES missing");
  const nested = [...nestedMatch[1].matchAll(/"([^"]+)"/g)].map((m) => m[1]);
  const logicalRoutes = [...new Set([...userTabs, ...nested])].sort();

  const physicalWires = walk(
    root,
    path.join(root, "packages/ui/canon"),
    (p) => p.endsWith(".wire.json"),
  ).sort();
  const wireEntries = physicalWires.map((w) => {
    let data = {};
    try {
      data = JSON.parse(fs.readFileSync(path.join(root, w), "utf8"));
    } catch {
      /* keep empty */
    }
    return {
      path: w,
      id: data.id || null,
      route: data.route || null,
      state: data.state || null,
    };
  });

  const man = JSON.parse(
    fs.readFileSync(path.join(root, "packages/ui/canon/manifest.json"), "utf8"),
  );
  const manifestSurfaces = (man.surfaces || []).map((s) => ({
    id: s.id,
    route: s.route,
    wire: norm(`packages/ui/canon/${s.wire}`),
    state: s.state || null,
    aliases: s.aliases || [],
  }));

  const adminSrc = fs.readFileSync(
    path.join(root, "apps/admin/routes.ts"),
    "utf8",
  );
  const topCountMatch = adminSrc.match(/ADMIN_TOP_LEVEL_COUNT\s*=\s*(\d+)/);
  const adminTopLevelCount = topCountMatch ? Number(topCountMatch[1]) : null;
  const modBlock = adminSrc.match(
    /export const ADMIN_MODULES\s*=\s*\[([\s\S]*?)\]\s*as const/,
  );
  if (!modBlock) throw new Error("ADMIN_MODULES missing");
  const adminTopLevelHrefs = [
    ...modBlock[1].matchAll(/href:\s*"([^"]+)"/g),
  ].map((m) => m[1]);

  const appMod = fs.readFileSync(
    path.join(root, "services/api-nest/src/app.module.ts"),
    "utf8",
  );
  const importBlock = appMod.match(/imports:\s*\[([\s\S]*?)\]/);
  if (!importBlock) throw new Error("AppModule.imports missing");
  const nestImports = importBlock[1]
    .split(",")
    .map((s) => s.trim())
    .filter((s) => /Module$/.test(s));

  const localMigrations = fs
    .readdirSync(path.join(root, "supabase/migrations"))
    .filter((f) => f.endsWith(".sql"))
    .sort()
    .map((f) => norm(`supabase/migrations/${f}`));
  const localVersions = localMigrations.map((f) =>
    path.posix.basename(f).slice(0, 14),
  );
  const fixturePath = "tooling/verify/fixtures/migrations-applied.v1.json";
  const fixture = JSON.parse(
    fs.readFileSync(path.join(root, fixturePath), "utf8"),
  );

  const brandAssets = walk(
    root,
    path.join(root, "packages/ui/brand/assets"),
    (p) => !/README\.md$/i.test(p),
  ).sort();
  const publicBrandAssets = walk(
    root,
    path.join(root, "apps/web/public/brand"),
    () => true,
  ).sort();

  const verifyScriptPaths = fs
    .readdirSync(path.join(root, "tooling/verify"))
    .filter((f) => f.endsWith(".cjs") && !f.startsWith("_tmp"))
    .sort()
    .map((f) => norm(`tooling/verify/${f}`));
  const stubPaths = walk(
    root,
    path.join(root, "tooling/verify/stubs"),
    (p) => p.endsWith(".cjs"),
  ).sort();
  const pkg = JSON.parse(
    fs.readFileSync(path.join(root, "package.json"), "utf8"),
  );
  const verifyPackageIds = Object.keys(pkg.scripts)
    .filter((k) => k.startsWith("verify:"))
    .sort();

  const contracts = walk(
    root,
    path.join(root, "packages/ui/canon/contracts"),
    (p) => /\.(md|json)$/.test(p),
  ).sort();

  const manifestIds = new Set(manifestSurfaces.map((s) => s.id));
  const wiresNotInManifest = wireEntries
    .filter((w) => w.id && !manifestIds.has(w.id))
    .map((w) => w.path);

  return {
    commitSha,
    dirtyPaths,
    pathSeparator: "/",
    web: {
      userTabs,
      logicalRoutes,
      physicalPages: webPhysicalPages,
    },
    admin: {
      topLevelCount: adminTopLevelCount,
      topLevelHrefs: adminTopLevelHrefs,
      physicalPages: adminPhysicalPages,
    },
    canon: {
      physicalWires: wireEntries,
      manifestSurfaces,
      wiresNotInManifest,
      contracts,
    },
    nest: {
      appModulePath: "services/api-nest/src/app.module.ts",
      imports: nestImports,
    },
    migrations: {
      localPaths: localMigrations,
      localVersions,
      remoteFixturePath: fixturePath,
      remoteVersions: fixture.versions || [],
    },
    assets: {
      brandManifestPath: "packages/ui/brand/brand.manifest.json",
      brandAssetPaths: brandAssets,
      publicBrandPaths: publicBrandAssets,
    },
    verify: {
      scriptPaths: verifyScriptPaths,
      stubPaths,
      packageScriptIds: verifyPackageIds,
    },
    counts: {
      webLogicalRoutes: logicalRoutes.length,
      webPhysicalPages: webPhysicalPages.length,
      adminPhysicalPages: adminPhysicalPages.length,
      adminTopLevel: adminTopLevelCount,
      canonPhysicalWires: physicalWires.length,
      canonManifestSurfaces: manifestSurfaces.length,
      wiresNotInManifest: wiresNotInManifest.length,
      nestImports: nestImports.length,
      localMigrations: localMigrations.length,
      remoteMigrations: (fixture.versions || []).length,
      brandAssets: brandAssets.length,
      publicBrandAssets: publicBrandAssets.length,
      verifyScripts: verifyScriptPaths.length,
      verifyPackageIds: verifyPackageIds.length,
      contracts: contracts.length,
    },
  };
}

module.exports = { measure, norm };
