/**
 * AI_PROFIT_OS project boundary helpers.
 * Deny clime-gb / foreign GitHub·Supabase by path/ref metadata only.
 */
"use strict";

const path = require("path");

const WORKSPACE_ROOT = path.resolve(__dirname, "..", "..", "..");
const ALLOWED_GITHUB = "phonarawd/ai-profit-os";
const ALLOWED_SUPABASE_REFS = new Set(["mgsytcetsiecllmhcyox"]);
const FOREIGN_SUPABASE_REFS = new Set(["qrvanbyjgflaugdaslqh", "yocjhjsdwoijfdrehzoq"]);

function deny(userMessage, agentMessage) {
  return {
    continue: true,
    permission: "deny",
    user_message: userMessage,
    userMessage,
    agent_message: agentMessage || userMessage,
    agentMessage: agentMessage || userMessage,
  };
}

function allow() {
  return { continue: true, permission: "allow" };
}

function normPath(p) {
  if (!p) return "";
  try {
    return path.resolve(String(p));
  } catch {
    return String(p);
  }
}

function isInsideWorkspace(filePath) {
  const abs = normPath(filePath);
  const root = normPath(WORKSPACE_ROOT);
  if (!abs || !root) return false;
  const a = abs.toLowerCase();
  const r = root.toLowerCase();
  return a === r || a.startsWith(r + path.sep.toLowerCase()) || a.startsWith(r + "\\") || a.startsWith(r + "/");
}

function blobLooksDenied(blob) {
  const s = String(blob || "");
  if (!s) return false;
  if (/clime-gb/i.test(s)) return true;
  if (/phonarawd\/clime-gb/i.test(s)) return true;
  for (const ref of FOREIGN_SUPABASE_REFS) {
    if (s.toLowerCase().includes(ref)) return true;
  }
  return false;
}

function evaluatePathAccess(filePath, opts) {
  const requirePath = opts && opts.requirePath;
  if (!filePath) {
    if (requirePath) {
      return deny(
        "Blocked: read path missing from hook payload (fail-closed).",
        "Isolation requires file path to evaluate."
      );
    }
    return allow();
  }
  if (blobLooksDenied(filePath)) {
    return deny(
      "Blocked: foreign project path (clime-gb).",
      "Stay inside AI_PROFIT_OS only."
    );
  }
  if (!isInsideWorkspace(filePath)) {
    return deny(
      "Blocked: path outside AI_PROFIT_OS workspace root.",
      "Allowed root: " + WORKSPACE_ROOT
    );
  }
  return allow();
}

function extractShellCommand(payload) {
  if (!payload || typeof payload !== "object") return "";
  if (payload.command) return String(payload.command);
  if (payload.cmd) return String(payload.cmd);
  const ti = payload.tool_input || payload.toolInput || payload.arguments || payload.input;
  if (typeof ti === "string") {
    try {
      const parsed = JSON.parse(ti);
      if (parsed && parsed.command) return String(parsed.command);
    } catch (_) {
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
  const ti = payload.tool_input || payload.toolInput || payload.arguments || payload.input;
  if (ti && typeof ti === "object") {
    if (ti.path) return String(ti.path);
    if (ti.file_path) return String(ti.file_path);
    if (ti.target_directory) return String(ti.target_directory);
  }
  if (Array.isArray(payload.attachments) && payload.attachments[0]) {
    const a = payload.attachments[0];
    if (a && a.file_path) return String(a.file_path);
  }
  return "";
}

function evaluateShellCommand(command, cwd, fullPayload) {
  const cmd = String(command || "");
  const blob =
    cmd +
    "\n" +
    String(cwd || "") +
    "\n" +
    (fullPayload ? JSON.stringify(fullPayload) : "");

  if (blobLooksDenied(blob)) {
    return deny(
      "Blocked: shell references clime-gb / foreign project.",
      "AI_PROFIT_OS isolation."
    );
  }

  // Missing command: do not hard-lock the agent (Cursor Win builds may omit it on
  // some hook events). Foreign markers still denied via blob above when present.
  if (!cmd.trim()) {
    return allow();
  }

  if (cwd && !isInsideWorkspace(cwd)) {
    return deny(
      "Blocked: shell cwd outside AI_PROFIT_OS.",
      "cwd must stay under " + WORKSPACE_ROOT
    );
  }

  // cd .. or cd to absolute outside
  const cdMatch = cmd.match(/(?:^|[;&|\n])\s*cd\s+([^\n;&|]+)/i);
  if (cdMatch) {
    const raw = cdMatch[1].trim().replace(/^['"]|['"]$/g, "");
    let target;
    try {
      target = path.isAbsolute(raw) ? path.resolve(raw) : path.resolve(cwd || WORKSPACE_ROOT, raw);
    } catch {
      target = raw;
    }
    if (blobLooksDenied(target) || !isInsideWorkspace(target)) {
      return deny(
        "Blocked: cd outside AI_PROFIT_OS / into clime-gb.",
        "Keep shell inside AI_PROFIT_OS."
      );
    }
  }

  const gitC = cmd.match(/\bgit\s+-C\s+("[^"]+"|'[^']+'|\S+)/i);
  if (gitC) {
    const p = gitC[1].replace(/^['"]|['"]$/g, "");
    const abs = path.isAbsolute(p) ? p : path.resolve(cwd || WORKSPACE_ROOT, p);
    if (blobLooksDenied(abs) || !isInsideWorkspace(abs)) {
      return deny("Blocked: git -C outside AI_PROFIT_OS.", "git -C must target AI_PROFIT_OS only.");
    }
  }

  if (/\bgh\s+/i.test(cmd)) {
    if (/clime-gb/i.test(cmd)) {
      return deny("Blocked: gh access to clime-gb.", "Use phonarawd/AI-Profit-OS only.");
    }
    const repoFlag = cmd.match(/-R\s+([A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+)/);
    const repoPos = cmd.match(/\bgh\s+repo\s+(?:view|clone|sync|fork)\s+([A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+)/i);
    const slug = (repoFlag && repoFlag[1]) || (repoPos && repoPos[1]);
    if (slug && slug.toLowerCase() !== ALLOWED_GITHUB) {
      return deny(
        "Blocked: gh target " + slug + " is not AI-Profit-OS.",
        "Allowed GitHub repository: phonarawd/AI-Profit-OS only."
      );
    }
  }

  if (/\bsupabase\b/i.test(cmd)) {
    if (/\bprojects\s+list\b/i.test(cmd)) {
      return deny(
        "Blocked: supabase projects list (account-wide).",
        "Use linked project mgsytcetsiecllmhcyox only."
      );
    }
    const refM = cmd.match(/--project-ref\s+(\S+)/i);
    if (refM && !ALLOWED_SUPABASE_REFS.has(refM[1])) {
      return deny(
        "Blocked: supabase --project-ref not AI_PROFIT_OS.",
        "Allowed project_ref: mgsytcetsiecllmhcyox"
      );
    }
  }

  return allow();
}

function evaluateMcpCall(payload) {
  const server = String(
    (payload && (payload.server || payload.url || payload.command)) || ""
  );
  const tool = String(
    (payload && (payload.tool_name || payload.toolName || payload.tool)) || ""
  );
  const input = (payload && (payload.tool_input || payload.arguments || payload.toolInput)) || {};
  const blob = JSON.stringify({ server: server, tool: tool, input: input }).toLowerCase();

  if (blobLooksDenied(blob)) {
    return deny(
      "Blocked: MCP call references foreign project.",
      "Only mgsytcetsiecllmhcyox / phonarawd/AI-Profit-OS."
    );
  }

  // Broad Supabase Cursor Plugin is account-wide — hard deny
  if (/plugin-supabase/i.test(server) || /plugin-supabase-supabase/i.test(blob)) {
    return deny(
      "Blocked: account-wide Supabase Plugin MCP.",
      "Use project-scoped MCP `supabase` (project_ref=mgsytcetsiecllmhcyox)."
    );
  }

  if (
    /list_projects|list_organizations|create_project|pause_project|restore_project|get_cost|confirm_cost/i.test(
      tool
    ) &&
    /supabase/i.test(server + tool)
  ) {
    return deny(
      "Blocked: account-wide Supabase MCP tool.",
      "Project-scoped mode only (mgsytcetsiecllmhcyox)."
    );
  }

  const inputStr = typeof input === "string" ? input : JSON.stringify(input);
  for (const ref of FOREIGN_SUPABASE_REFS) {
    if (inputStr.toLowerCase().includes(ref)) {
      return deny("Blocked: foreign Supabase project_id.", "Allowed: mgsytcetsiecllmhcyox only.");
    }
  }

  const explicit =
    inputStr.match(/"(?:project_id|project_ref)"\s*:\s*"([^"]+)"/i) ||
    inputStr.match(/project[_-]?(?:id|ref)["'\s:=]+([a-z0-9]{20})/i);
  if (explicit && !ALLOWED_SUPABASE_REFS.has(explicit[1])) {
    return deny(
      "Blocked: Supabase project not in allowlist.",
      "Allowed project_ref: mgsytcetsiecllmhcyox"
    );
  }

  if (/plugin-github|github/i.test(server)) {
    if (/clime-gb/i.test(inputStr)) {
      return deny("Blocked: GitHub MCP targeting clime-gb.", "Allowed: phonarawd/AI-Profit-OS only.");
    }
    const repo = inputStr.match(/"owner"\s*:\s*"([^"]+)"[\s\S]*?"repo"\s*:\s*"([^"]+)"/i);
    if (repo) {
      const slug = (repo[1] + "/" + repo[2]).toLowerCase();
      if (slug !== ALLOWED_GITHUB) {
        return deny(
          "Blocked: GitHub MCP repo " + repo[1] + "/" + repo[2] + ".",
          "Allowed repository: phonarawd/AI-Profit-OS only."
        );
      }
    }
  }

  if (
    /supabase.*auth|auth\.users|sign_up|sign_in_with|create_user|gotrue/.test(blob) &&
    /supabase/i.test(server + tool) &&
    /enable.*supabase auth|auth\.uid\(\).*session sot|create policy.*auth\.users/.test(blob)
  ) {
    return deny(
      "Blocked: Supabase Auth SoT forbidden (ADR-006).",
      "Use Nest JWT. Supabase MCP = DB/migrations only."
    );
  }

  return allow();
}

function evaluateToolUse(payload) {
  const tool = String((payload && (payload.tool_name || payload.toolName)) || "");
  let input = (payload && (payload.tool_input || payload.arguments || payload.toolInput)) || {};
  if (typeof input === "string") {
    try {
      input = JSON.parse(input);
    } catch (_) {
      input = { command: input };
    }
  }
  const cwd = (payload && payload.cwd) || process.cwd();

  // Any tool payload that carries a shell command must be gated (name varies by Cursor build).
  const shellCmd = extractShellCommand(payload) || String((input && input.command) || "");
  if (
    tool === "Shell" ||
    /^shell$/i.test(tool) ||
    /^bash$/i.test(tool) ||
    /shell/i.test(tool) ||
    (shellCmd && (tool === "" || /terminal|command|exec/i.test(tool)))
  ) {
    return evaluateShellCommand(
      shellCmd,
      (input && (input.working_directory || input.cwd)) || cwd,
      null
    );
  }
  // If command is present even with unknown tool name, still gate it.
  if (shellCmd && !/^read|write|strreplace|grep|glob|edit/i.test(tool)) {
    return evaluateShellCommand(
      shellCmd,
      (input && (input.working_directory || input.cwd)) || cwd,
      null
    );
  }

  if (/^read$/i.test(tool) || tool === "Read" || tool === "beforeReadFile") {
    const p = extractReadPath(payload);
    return evaluatePathAccess(p, { requirePath: true });
  }

  // Write/StrReplace/Edit: gate on destination path only (not file contents).
  const pathKeys = ["path", "file_path", "target_directory", "target_notebook", "working_directory"];
  if (input && typeof input === "object") {
    for (let i = 0; i < pathKeys.length; i++) {
      const p = input[pathKeys[i]];
      if (!p) continue;
      const s = String(p);
      if (path.isAbsolute(s) || /^[A-Za-z]:[\\/]/.test(s) || s.indexOf("\\\\") === 0) {
        const r = evaluatePathAccess(s);
        if (r.permission === "deny") return r;
      } else if (blobLooksDenied(s)) {
        return deny(
          "Blocked: relative path targets foreign project.",
          "Stay inside AI_PROFIT_OS only."
        );
      }
    }
  }
  return allow();
}

module.exports = {
  WORKSPACE_ROOT: WORKSPACE_ROOT,
  ALLOWED_SUPABASE_REFS: ALLOWED_SUPABASE_REFS,
  isInsideWorkspace: isInsideWorkspace,
  blobLooksDenied: blobLooksDenied,
  extractShellCommand: extractShellCommand,
  extractReadPath: extractReadPath,
  evaluatePathAccess: evaluatePathAccess,
  evaluateShellCommand: evaluateShellCommand,
  evaluateMcpCall: evaluateMcpCall,
  evaluateToolUse: evaluateToolUse,
  deny: deny,
  allow: allow,
};
