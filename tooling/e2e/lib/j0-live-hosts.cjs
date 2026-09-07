/** J0 전용 staging host 잠금. preview / production 을 J0 host 로 쓰지 않는다. */
"use strict";

module.exports = {
  DEDICATED_WEB: "https://ai-profit-web-dedicated.ebay-adapter.workers.dev",
  DEDICATED_OPS: "https://ai-profit-ops-dedicated.ebay-adapter.workers.dev",
  DEDICATED_OPS_LOGIN:
    "https://ai-profit-ops-dedicated.ebay-adapter.workers.dev/admin/login",
  STAGING_API: "https://ai-profit-os-staging.onrender.com",
  PRODUCTION_WEB: "https://app.hiptk.app",
  PRODUCTION_OPS: "https://ops.hiptk.app",
  PRODUCTION_API: "https://ai-profit-os.onrender.com",
  PRODUCTION_API_PUBLIC: "https://api.hiptk.app",
  FORBIDDEN_ACCESS_HOSTS: [
    "ai-profit-web-dedicated.ebay-adapter.workers.dev",
    "app.hiptk.app",
    "pages.dev",
  ],
  STAGING_RENDER: "srv-dabph32fngtc73esj8rg",
  PRODUCTION_RENDER: "srv-da5r1tqjobas73fl16dg",
  REJECT_SHA: "7c6a2b0abe259847b7b1d7939ce7e1d98e6f654f",
};
