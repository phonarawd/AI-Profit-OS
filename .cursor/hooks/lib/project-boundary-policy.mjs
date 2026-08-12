/**
 * AI_PROFIT_OS project isolation — pure policy (no I/O).
 * Wave: PROJECT_ISOLATION_MIRROR
 *
 * DENY codes: FOREIGN_FS | FOREIGN_GITHUB | FOREIGN_SUPABASE | GLOBAL_CURSOR_PLANS
 * Fixture/path-string only — never open foreign project contents.
 */
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_WORKSPACE_ROOT = path.resolve(HERE, "..", "..", "..");

export const ALLOWED_GITHUB = "phonarawd/ai-profit-os";
export const ALLOWED_SUPABASE_REF = "mgsytcetsiecllmhcyox";
export const FOREIGN_GITHUB = "phonarawd/clime-gb";
export const FOREIGN_SUPABASE_REF = "qrvanbyjgflaugdaslqh";

const FOREIGN_FS_MARKERS = [
  /clime-gb/i,
  /(^|[/\\])clime_/i,
  /[/\\]clime[/\\]/i,
];

export function deny(code, userMessage, agentMessage) {
  const msg = userMessage || code;
  return {
    continue: true,
    permission: "deny",
    code,
    user_message: msg,
    userMessage: msg,
    agent_message: agentMessage || msg,
    agentMessage: agentMessage || msg,
  };
}

export function allow() {
  return { continue: true, permission: "allow" };
}

function homeDir(opts) {
  return (
    (opts && opts.homeDir) ||
    process.env.USERPROFILE ||
    process.env.HOME ||
    ""
  );
}

export function cursorProjectSlug(workspaceRoot) {
  const abs = path.resolve(String(workspaceRoot || ""));
  return abs
    .replace(/^([A-Za-z]):/, (_, d) => d.toLowerCase())
    .replace(/^[\\/]+/, "")
    .replace(/[\\/]+/g, "-");
}

function normPath(p) {
  if (!p) return "";
  try {
    return path.resolve(String(p));
  } catch {
    return String(p);
  }
}

function lower(p) {
  return String(p || "").toLowerCase();
}

function isUnder(absPath, root) {
  const a = lower(normPath(absPath));
  const r = lower(normPath(root));
  if (!a || !r) return false;
  return (
    a === r ||
    a.startsWith(r + path.sep.toLowerCase()) ||
    a.startsWith(r + "\\") ||
    a.startsWith(r + "/")
  );
}

function looksLikeGlobalPlansString(blob) {
  const s = String(blob || "");
  if (!s) return false;
  if (/\$env:USERPROFILE\s*[\\/]?\.cursor[\\/]plans/i.test(s)) return true;
  if (/%USERPROFILE%[/\\]\.cursor[/\\]plans/i.test(s)) return true;
  if (/[~][/\\]\.cursor[/\\]plans/i.test(s)) return true;
  if (/[/\\]\.cursor[/\\]plans\b/i.test(s)) return true;
  return false;
}

function hasForeignFsMarker(blob) {
  const s = String(blob || "");
  if (!s) return false;
  if (s.toLowerCase().includes(FOREIGN_SUPABASE_REF)) return true;
  for (const re of FOREIGN_FS_MARKERS) {
    if (re.test(s)) return true;
  }
  if (/phonarawd\/clime-gb/i.test(s)) return true;
  return false;
}

/** Shell: deny path/access to foreign FS — not mere mention in heredoc/docs. */
function shellTargetsForeignFs(cmd, cwd) {
  const s = String(cmd || "");
  const c = String(cwd || "");
  if (hasForeignFsMarker(c)) return true;
  // Absolute / Desktop path to clime-gb
  if (/[A-Za-z]:\\(?:Users\\[^\\]+\\)?Desktop\\clime-gb\b/i.test(s)) return true;
  if (/[/\\]clime-gb(?:[/\\]|$)/i.test(s) &&
      /\b(cd|Set-Location|Push-Location|Get-ChildItem|Get-Content|Get-Item|dir|ls|cat|type|gc|git\s+-C|Remove-Item|ri|rm|del|code|cursor)\b/i.test(s)) {
    return true;
  }
  if (/\bgit\s+-C\s+["']?[^"'\n]*clime-gb/i.test(s)) return true;
  return false;
}

function isDeniedPlanInRepo(filePath) {
  const full = String(filePath || "").replace(/\\/g, "/");
  const base = path.basename(full);
  const baseL = base.toLowerCase();
  const fullL = full.toLowerCase();
  if (/^clime_.*\.plan\.md$/i.test(base)) return true;
  if (baseL.includes("clime-gb") && /\.plan\.md$/i.test(baseL)) return true;
  if (fullL.includes("clime-gb") && /\.plan\.md$/i.test(fullL)) return true;
  if (fullL.includes("/.cursor/plans/") && /clime[_-]/i.test(baseL)) {
    return true;
  }
  return false;
}

/**
 * @param {{ workspaceRoot?: string, homeDir?: string }} [opts]
 */
export function createPolicy(opts = {}) {
  const workspaceRoot = path.resolve(
    opts.workspaceRoot || DEFAULT_WORKSPACE_ROOT
  );
  const home = homeDir(opts);
  const globalPlansRoot = home
    ? path.resolve(home, ".cursor", "plans")
    : "";
  const allowedProjectCache = home
    ? path.resolve(
        home,
        ".cursor",
        "projects",
        cursorProjectSlug(workspaceRoot)
      )
    : "";
  const repoPlansRoot = path.resolve(workspaceRoot, ".cursor", "plans");

  function isGlobalCursorPlans(filePath) {
    if (!filePath) return false;
    const raw = String(filePath);
    // Env / home-qualified forms → always global
    if (/\$env:USERPROFILE/i.test(raw) && /\.cursor[/\\]plans/i.test(raw)) {
      return true;
    }
    if (/%USERPROFILE%/i.test(raw) && /\.cursor[/\\]plans/i.test(raw)) {
      return true;
    }
    if (/[~][/\\]\.cursor[/\\]plans/i.test(raw)) return true;
    // Absolute under %USERPROFILE%\.cursor\plans
    if (globalPlansRoot && isUnder(raw, globalPlansRoot)) return true;
    // Any .cursor/plans path: deny only if outside this workspace
    if (/[/\\]\.cursor[/\\]plans\b/i.test(raw) || /^\.cursor[/\\]plans\b/i.test(raw)) {
      try {
        const abs =
          path.isAbsolute(raw) || /^[A-Za-z]:[\\/]/.test(raw)
            ? normPath(raw)
            : normPath(path.resolve(workspaceRoot, raw));
        if (isUnder(abs, workspaceRoot)) return false;
        return true;
      } catch {
        return true;
      }
    }
    return false;
  }

  function isAllowedFs(filePath) {
    if (!filePath) return false;
    if (isUnder(filePath, workspaceRoot)) return true;
    if (allowedProjectCache && isUnder(filePath, allowedProjectCache)) {
      return true;
    }
    return false;
  }

  function classifyPath(filePath, { requirePath = false } = {}) {
    if (!filePath) {
      if (requirePath) {
        return deny(
          "FOREIGN_FS",
          "Blocked: path missing from hook payload.",
          "Isolation requires a path to evaluate."
        );
      }
      return allow();
    }

    const raw = String(filePath);

    if (isGlobalCursorPlans(raw)) {
      return deny(
        "GLOBAL_CURSOR_PLANS",
        "Blocked: global Cursor plans (~/.cursor/plans).",
        "Plan SSOT is repo .cursor/plans only."
      );
    }

    if (hasForeignFsMarker(raw) || isDeniedPlanInRepo(raw)) {
      return deny(
        "FOREIGN_FS",
        "Blocked: foreign project path (clime-gb / clime plan marker).",
        "Stay inside AI_PROFIT_OS only. Do not open clime paths."
      );
    }

    if (
      path.isAbsolute(raw) ||
      /^[A-Za-z]:[\\/]/.test(raw) ||
      raw.startsWith("\\\\")
    ) {
      if (!isAllowedFs(raw)) {
        return deny(
          "FOREIGN_FS",
          "Blocked: path outside AI_PROFIT_OS allowlist.",
          "Allowed: workspace root, this project ~/.cursor/projects/<slug>, repo .cursor/plans."
        );
      }
      if (isDeniedPlanInRepo(raw)) {
        return deny(
          "FOREIGN_FS",
          "Blocked: clime plan marker inside workspace.",
          "clime_*.plan.md / *clime-gb* plans are forbidden."
        );
      }
      return allow();
    }

    if (hasForeignFsMarker(raw) || isDeniedPlanInRepo(raw)) {
      return deny(
        "FOREIGN_FS",
        "Blocked: relative path targets foreign project.",
        "Stay inside AI_PROFIT_OS only."
      );
    }
    if (looksLikeGlobalPlansString(raw)) {
      return deny(
        "GLOBAL_CURSOR_PLANS",
        "Blocked: global Cursor plans reference.",
        "Plan SSOT is repo .cursor/plans only."
      );
    }
    return allow();
  }

  function extractShellCommand(payload) {
    if (!payload || typeof payload !== "object") return "";
    if (payload.command) return String(payload.command);
    if (payload.cmd) return String(payload.cmd);
    const ti =
      payload.tool_input ||
      payload.toolInput ||
      payload.arguments ||
      payload.input;
    if (typeof ti === "string") {
      try {
        const parsed = JSON.parse(ti);
        if (parsed && parsed.command) return String(parsed.command);
      } catch {
        return ti;
      }
    }
    if (ti && typeof ti === "object") {
      if (ti.command) return String(ti.command);
      if (ti.cmd) return String(ti.cmd);
    }
    return "";
  }

  function extractReadPath(payload) {
    if (!payload || typeof payload !== "object") return "";
    if (payload.file_path) return String(payload.file_path);
    if (payload.path) return String(payload.path);
    if (payload.filePath) return String(payload.filePath);
    const ti =
      payload.tool_input ||
      payload.toolInput ||
      payload.arguments ||
      payload.input;
    if (ti && typeof ti === "object") {
      if (ti.path) return String(ti.path);
      if (ti.file_path) return String(ti.file_path);
      if (ti.target_directory) return String(ti.target_directory);
      if (ti.target_notebook) return String(ti.target_notebook);
    }
    if (Array.isArray(payload.attachments) && payload.attachments[0]) {
      const a = payload.attachments[0];
      if (a && a.file_path) return String(a.file_path);
    }
    return "";
  }

  function decideRead(payload) {
    if (Array.isArray(payload && payload.attachments)) {
      for (const a of payload.attachments) {
        if (a && a.file_path) {
          const r = classifyPath(a.file_path, { requirePath: true });
          if (r.permission === "deny") return r;
        }
      }
    }
    const filePath = extractReadPath(payload);
    return classifyPath(filePath, { requirePath: Boolean(filePath) });
  }

  function decideEdit(payload) {
    const ti =
      (payload &&
        (payload.tool_input ||
          payload.toolInput ||
          payload.arguments ||
          payload.input)) ||
      {};
    const input =
      typeof ti === "string"
        ? (() => {
            try {
              return JSON.parse(ti);
            } catch {
              return {};
            }
          })()
        : ti;
    const keys = [
      "path",
      "file_path",
      "target_directory",
      "target_notebook",
      "working_directory",
    ];
    if (input && typeof input === "object") {
      for (const k of keys) {
        if (!input[k]) continue;
        const r = classifyPath(String(input[k]));
        if (r.permission === "deny") return r;
      }
    }
    const top = extractReadPath(payload);
    if (top) return classifyPath(top);
    return allow();
  }

  function decideShell(payload) {
    const cmd = extractShellCommand(payload);
    const cwd =
      (payload && payload.cwd) ||
      (payload &&
        payload.tool_input &&
        (payload.tool_input.working_directory || payload.tool_input.cwd)) ||
      "";
    const blob = [cmd, cwd].join("\n");

    // Global plans: deny FS access commands only (not heredoc/docs that mention the path).
    if (isGlobalCursorPlans(cwd)) {
      return deny(
        "GLOBAL_CURSOR_PLANS",
        "Blocked: shell cwd is global ~/.cursor/plans.",
        "Plan SSOT is repo .cursor/plans only."
      );
    }
    if (
      /\b(Get-ChildItem|Get-Content|Get-Item|gc|dir|ls|type|cat|cd|Set-Location|Push-Location|Remove-Item|ri|rm|del)\b/i.test(
        cmd
      ) &&
      looksLikeGlobalPlansString(cmd)
    ) {
      return deny(
        "GLOBAL_CURSOR_PLANS",
        "Blocked: listing/reading/cd into global Cursor plans via shell.",
        "Do not access %USERPROFILE%\\.cursor\\plans."
      );
    }
    // Bare path argument to common readers (no verb) still DENY.
    if (
      /^\s*(?:["']).*[/\\]\.cursor[/\\]plans(?:[/\\][^"']*)?["']\s*$/i.test(
        cmd.trim()
      ) ||
      /^\s*[A-Za-z]:\\Users\\[^\\]+\\\.cursor\\plans(?:\\[^\s]+)?\s*$/i.test(
        cmd.trim()
      )
    ) {
      return deny(
        "GLOBAL_CURSOR_PLANS",
        "Blocked: shell targets global Cursor plans path.",
        "Plan SSOT is repo .cursor/plans only."
      );
    }

    // Foreign FS: path-shaped / access-shaped only (docs mentioning markers OK).
    if (shellTargetsForeignFs(cmd, cwd)) {
      return deny(
        "FOREIGN_FS",
        "Blocked: shell targets clime-gb / foreign FS path.",
        "AI_PROFIT_OS isolation — fixture strings only for DENY checks."
      );
    }

    if (!cmd.trim()) {
      return allow();
    }

    if (cwd && !isAllowedFs(cwd) && !isUnder(cwd, workspaceRoot)) {
      if (isGlobalCursorPlans(cwd)) {
        return deny(
          "GLOBAL_CURSOR_PLANS",
          "Blocked: shell cwd is global plans.",
          "cwd must stay under AI_PROFIT_OS."
        );
      }
      return deny(
        "FOREIGN_FS",
        "Blocked: shell cwd outside AI_PROFIT_OS allowlist.",
        "cwd must stay under " + workspaceRoot
      );
    }

    const cdMatch = cmd.match(/(?:^|[;&|\n])\s*cd\s+([^\n;&|]+)/i);
    if (cdMatch) {
      const raw = cdMatch[1].trim().replace(/^['"]|['"]$/g, "");
      let target;
      try {
        target = path.isAbsolute(raw)
          ? path.resolve(raw)
          : path.resolve(cwd || workspaceRoot, raw);
      } catch {
        target = raw;
      }
      const r = classifyPath(target);
      if (r.permission === "deny") {
        return deny(
          r.code || "FOREIGN_FS",
          "Blocked: cd outside AI_PROFIT_OS / into denied path.",
          "Keep shell inside AI_PROFIT_OS."
        );
      }
    }

    const gitC = cmd.match(/\bgit\s+-C\s+("[^"]+"|'[^']+'|\S+)/i);
    if (gitC) {
      const p = gitC[1].replace(/^['"]|['"]$/g, "");
      const abs = path.isAbsolute(p)
        ? p
        : path.resolve(cwd || workspaceRoot, p);
      const r = classifyPath(abs);
      if (r.permission === "deny") {
        return deny(
          r.code || "FOREIGN_FS",
          "Blocked: git -C outside AI_PROFIT_OS.",
          "git -C must target AI_PROFIT_OS only."
        );
      }
    }

    if (/\bgh\s+/i.test(cmd)) {
      if (/clime-gb/i.test(cmd) || /phonarawd\/clime-gb/i.test(cmd)) {
        return deny(
          "FOREIGN_GITHUB",
          "Blocked: gh access to phonarawd/clime-gb.",
          "Allowed GitHub: phonarawd/AI-Profit-OS only."
        );
      }
      const repoFlag = cmd.match(/-R\s+([A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+)/);
      const repoPos = cmd.match(
        /\bgh\s+repo\s+(?:view|clone|sync|fork)\s+([A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+)/i
      );
      const slug = (repoFlag && repoFlag[1]) || (repoPos && repoPos[1]);
      if (slug && slug.toLowerCase() !== ALLOWED_GITHUB) {
        return deny(
          "FOREIGN_GITHUB",
          "Blocked: gh target " + slug + " is not AI-Profit-OS.",
          "Allowed GitHub repository: phonarawd/AI-Profit-OS only."
        );
      }
    }

    if (/\bsupabase\b/i.test(cmd)) {
      // CLI shape only: `supabase projects list` / `supabase orgs list`
      if (
        /\bsupabase\b(?:\s+\S+)*\s+projects\s+list\b/i.test(cmd) ||
        /\bsupabase\b(?:\s+\S+)*\s+orgs\s+list\b/i.test(cmd)
      ) {
        return deny(
          "FOREIGN_SUPABASE",
          "Blocked: supabase account-wide projects/orgs list.",
          "Use linked project " + ALLOWED_SUPABASE_REF + " only."
        );
      }
      const refM = cmd.match(/--project-ref\s+(\S+)/i);
      if (refM) {
        const ref = refM[1].toLowerCase();
        if (ref === FOREIGN_SUPABASE_REF) {
          return deny(
            "FOREIGN_SUPABASE",
            "Blocked: supabase --project-ref foreign (clime).",
            "Allowed project_ref: " + ALLOWED_SUPABASE_REF
          );
        }
        if (ref !== ALLOWED_SUPABASE_REF) {
          return deny(
            "FOREIGN_SUPABASE",
            "Blocked: supabase --project-ref not AI_PROFIT_OS.",
            "Allowed project_ref: " + ALLOWED_SUPABASE_REF
          );
        }
      }
      if (cmd.toLowerCase().includes(FOREIGN_SUPABASE_REF)) {
        return deny(
          "FOREIGN_SUPABASE",
          "Blocked: foreign Supabase project_ref in shell.",
          "Allowed: " + ALLOWED_SUPABASE_REF
        );
      }
    }

    return allow();
  }

  function decideMcp(payload) {
    const server = String(
      (payload && (payload.server || payload.url || payload.command)) || ""
    );
    const tool = String(
      (payload && (payload.tool_name || payload.toolName || payload.tool)) ||
        ""
    );
    const input =
      (payload &&
        (payload.tool_input || payload.arguments || payload.toolInput)) ||
      {};
    const blob = JSON.stringify({
      server,
      tool,
      input,
    }).toLowerCase();

    if (looksLikeGlobalPlansString(blob)) {
      return deny(
        "GLOBAL_CURSOR_PLANS",
        "Blocked: MCP references global Cursor plans.",
        "Plan SSOT is repo .cursor/plans only."
      );
    }

    if (hasForeignFsMarker(blob) || blob.includes(FOREIGN_GITHUB)) {
      if (blob.includes(FOREIGN_SUPABASE_REF)) {
        return deny(
          "FOREIGN_SUPABASE",
          "Blocked: MCP references foreign Supabase project.",
          "Allowed: " + ALLOWED_SUPABASE_REF
        );
      }
      if (blob.includes("clime-gb") || blob.includes(FOREIGN_GITHUB)) {
        return deny(
          "FOREIGN_GITHUB",
          "Blocked: MCP references phonarawd/clime-gb.",
          "Allowed: phonarawd/AI-Profit-OS only."
        );
      }
      return deny(
        "FOREIGN_FS",
        "Blocked: MCP call references foreign project.",
        "Only " + ALLOWED_SUPABASE_REF + " / phonarawd/AI-Profit-OS."
      );
    }

    if (
      /plugin-supabase/i.test(server) ||
      /plugin-supabase-supabase/i.test(blob)
    ) {
      return deny(
        "FOREIGN_SUPABASE",
        "Blocked: account-wide Supabase Plugin MCP.",
        "Use project-scoped MCP supabase (" + ALLOWED_SUPABASE_REF + ")."
      );
    }

    if (
      /list_projects|list_organizations|create_project|pause_project|restore_project|get_cost|confirm_cost/i.test(
        tool
      ) &&
      /supabase/i.test(server + tool)
    ) {
      return deny(
        "FOREIGN_SUPABASE",
        "Blocked: account-wide Supabase MCP tool.",
        "Project-scoped mode only (" + ALLOWED_SUPABASE_REF + ")."
      );
    }

    const inputStr = typeof input === "string" ? input : JSON.stringify(input);
    if (inputStr.toLowerCase().includes(FOREIGN_SUPABASE_REF)) {
      return deny(
        "FOREIGN_SUPABASE",
        "Blocked: foreign Supabase project_id.",
        "Allowed: " + ALLOWED_SUPABASE_REF + " only."
      );
    }

    const explicit =
      inputStr.match(/"(?:project_id|project_ref)"\s*:\s*"([^"]+)"/i) ||
      inputStr.match(/project[_-]?(?:id|ref)["'\s:=]+([a-z0-9]{20})/i);
    if (explicit && explicit[1].toLowerCase() !== ALLOWED_SUPABASE_REF) {
      return deny(
        "FOREIGN_SUPABASE",
        "Blocked: Supabase project not in allowlist.",
        "Allowed project_ref: " + ALLOWED_SUPABASE_REF
      );
    }

    if (/plugin-github|github/i.test(server)) {
      if (/clime-gb/i.test(inputStr)) {
        return deny(
          "FOREIGN_GITHUB",
          "Blocked: GitHub MCP targeting clime-gb.",
          "Allowed: phonarawd/AI-Profit-OS only."
        );
      }
      const repo = inputStr.match(
        /"owner"\s*:\s*"([^"]+)"[\s\S]*?"repo"\s*:\s*"([^"]+)"/i
      );
      if (repo) {
        const slug = (repo[1] + "/" + repo[2]).toLowerCase();
        if (slug !== ALLOWED_GITHUB) {
          return deny(
            "FOREIGN_GITHUB",
            "Blocked: GitHub MCP repo " + repo[1] + "/" + repo[2] + ".",
            "Allowed repository: phonarawd/AI-Profit-OS only."
          );
        }
      }
    }

    return allow();
  }

  function decidePreToolUse(payload) {
    const tool = String(
      (payload && (payload.tool_name || payload.toolName)) || ""
    );
    let input =
      (payload &&
        (payload.tool_input || payload.arguments || payload.toolInput)) ||
      {};
    if (typeof input === "string") {
      try {
        input = JSON.parse(input);
      } catch {
        input = { command: input };
      }
    }

    const shellCmd =
      extractShellCommand(payload) || String((input && input.command) || "");
    if (
      tool === "Shell" ||
      /^shell$/i.test(tool) ||
      /^bash$/i.test(tool) ||
      (/shell/i.test(tool) && shellCmd) ||
      (shellCmd && (tool === "" || /terminal|command|exec/i.test(tool)))
    ) {
      return decideShell({
        ...payload,
        command: shellCmd,
        cwd:
          (input && (input.working_directory || input.cwd)) ||
          payload.cwd ||
          "",
      });
    }

    if (shellCmd && !/^read|write|strreplace|grep|glob|edit|task/i.test(tool)) {
      return decideShell({
        ...payload,
        command: shellCmd,
        cwd:
          (input && (input.working_directory || input.cwd)) ||
          payload.cwd ||
          "",
      });
    }

    if (/^read$/i.test(tool) || tool === "Read") {
      return decideRead({ ...payload, tool_input: input });
    }

    if (
      /^(write|strreplace|editnotebook|delete)$/i.test(tool) ||
      tool === "Write" ||
      tool === "StrReplace" ||
      tool === "Delete" ||
      tool === "EditNotebook"
    ) {
      return decideEdit({ ...payload, tool_input: input });
    }

    if (
      /^(grep|glob|task|fetchmcpresource)$/i.test(tool) ||
      tool === "Grep" ||
      tool === "Glob" ||
      tool === "Task"
    ) {
      const blob = JSON.stringify(input || {});
      if (looksLikeGlobalPlansString(blob)) {
        return deny(
          "GLOBAL_CURSOR_PLANS",
          "Blocked: Grep/Glob/Task targets global Cursor plans.",
          "Plan SSOT is repo .cursor/plans only."
        );
      }
      if (hasForeignFsMarker(blob)) {
        return deny(
          "FOREIGN_FS",
          "Blocked: Grep/Glob/Task targets foreign (clime) path.",
          "Do not search or compare clime-gb."
        );
      }
      const pathKeys = [
        "path",
        "target_directory",
        "working_directory",
        "cwd",
        "root",
        "file_path",
      ];
      for (const k of pathKeys) {
        if (input && input[k]) {
          const r = classifyPath(String(input[k]));
          if (r.permission === "deny") return r;
        }
      }
    }

    return decideEdit({ ...payload, tool_input: input });
  }

  function decideFromPayload(payload) {
    if (!payload || typeof payload !== "object") return allow();
    const event = String(
      payload.hook_event_name ||
        payload.hookEventName ||
        payload.event ||
        payload.event_name ||
        ""
    );

    if (/beforeRead|TabFileRead|read_file/i.test(event)) {
      return decideRead(payload);
    }
    if (/beforeShell|shell/i.test(event) && !/preTool/i.test(event)) {
      return decideShell(payload);
    }
    if (/beforeMCP|mcp/i.test(event)) {
      return decideMcp(payload);
    }
    if (/preToolUse|pre_tool/i.test(event)) {
      return decidePreToolUse(payload);
    }

    if (payload.server || payload.toolName || payload.tool_name) {
      const t = String(payload.tool_name || payload.toolName || "");
      if (payload.server || /mcp/i.test(t)) return decideMcp(payload);
      return decidePreToolUse(payload);
    }
    if (payload.command || payload.cmd) return decideShell(payload);
    if (payload.file_path || payload.filePath) return decideRead(payload);
    if (payload.path && !payload.tool_input) return decideRead(payload);
    return decidePreToolUse(payload);
  }

  return {
    workspaceRoot,
    globalPlansRoot,
    allowedProjectCache,
    repoPlansRoot,
    classifyPath,
    extractShellCommand,
    extractReadPath,
    decideRead,
    decideEdit,
    decideShell,
    decideMcp,
    decidePreToolUse,
    decideFromPayload,
    isGlobalCursorPlans,
    isAllowedFs,
  };
}

const defaultPolicy = createPolicy();

export const WORKSPACE_ROOT = defaultPolicy.workspaceRoot;
export const decideRead = (p) => defaultPolicy.decideRead(p);
export const decideEdit = (p) => defaultPolicy.decideEdit(p);
export const decideShell = (p) => defaultPolicy.decideShell(p);
export const decideMcp = (p) => defaultPolicy.decideMcp(p);
export const decidePreToolUse = (p) => defaultPolicy.decidePreToolUse(p);
export const decideFromPayload = (p) => defaultPolicy.decideFromPayload(p);
export const extractShellCommand = (p) =>
  defaultPolicy.extractShellCommand(p);
export const extractReadPath = (p) => defaultPolicy.extractReadPath(p);
