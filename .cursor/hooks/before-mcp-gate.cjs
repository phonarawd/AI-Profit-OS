#!/usr/bin/env node
/** beforeMCPExecution — block Supabase Auth SoT misuse patterns in tool args */
const fs = require("fs");

let input = "";
try {
  input = fs.readFileSync(0, "utf8");
} catch {
  input = "{}";
}

let payload = {};
try {
  payload = JSON.parse(input || "{}");
} catch {
  payload = {};
}

const blob = JSON.stringify(payload).toLowerCase();
const tool = String(payload.toolName || payload.tool || "");

const denyAuth =
  /supabase.*auth|auth\.users|sign_up|sign_in_with|create_user|gotrue/.test(blob) &&
  /plugin-supabase|supabase/i.test(String(payload.server || tool || blob));

if (denyAuth && /auth/.test(blob)) {
  // Allow pure SQL on public/ledger; deny clear Auth SoT setup
  if (/enable.*supabase auth|auth\.uid\(\).*session sot|create policy.*auth\.users/.test(blob)) {
    process.stdout.write(
      JSON.stringify({
        continue: true,
        permission: "deny",
        userMessage: "Blocked: Supabase Auth SoT forbidden (ADR-006).",
        agentMessage: "Use Nest JWT. Supabase MCP = DB/migrations only.",
      })
    );
    process.exit(0);
  }
}

process.stdout.write(JSON.stringify({ continue: true, permission: "allow" }));
