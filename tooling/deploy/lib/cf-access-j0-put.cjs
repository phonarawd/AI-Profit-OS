"use strict";
const h = require("./cf-access-j0-cf.cjs");
async function putPolicies(ctx) {
  const emails = h.emailsFromEnv();
  const allow = emails.map((email) => ({ email: { email } }));
  const policies = emails.length
    ? [{ name: "s5-dedicated-allow-listed", decision: "allow", include: allow }]
    : [{ name: "s5-dedicated-deny-until-emails", decision: "deny", include: [{ everyone: {} }] }];
  policies.push({
    name: "j0-service-auth",
    decision: "non_identity",
    include: [{ service_token: { token_id: ctx.svc.id } }],
  });
  const app = await h.cf(
    "PUT",
    "/accounts/" + h.ACCOUNT_ID + "/access/apps/" + ctx.existing.id,
    {
      type: "self_hosted",
      name: h.APP_NAME,
      domain: h.HOST,
      session_duration: "24h",
      auto_redirect_to_identity: true,
      policies,
    },
  );
  const aud = Array.isArray(app.aud) ? app.aud[0] : app.aud;
  const keys = {
    CF_ACCESS_TEAM_DOMAIN: ctx.teamOrigin,
    CF_ACCESS_AUD: String(aud || process.env.CF_ACCESS_AUD || ""),
    CF_ACCESS_CLIENT_ID: ctx.clientId,
  };
  keys.CF_ACCESS_CLIENT_SECRET = ctx.clientSecret;
  h.upsertEnv(keys);
  console.log("[cf-access-j0-service-token] PASS");
  console.log("email_rules=" + emails.length);
  console.log("service_auth=1");
}
module.exports = { putPolicies };

