"use strict";

/**
 * Full browser Lighthouse collection for the existing REL-404 manual workflow.
 *
 * Governance locks:
 * - No numeric performance/SEO/accessibility SLO is invented here.
 * - Results are collected to the GitHub Actions filesystem artifact only.
 * - Home visual/geometry locks remain owned by REL-404 static verification.
 * - This config is intended for workflow_dispatch, not automatic PR execution.
 */
module.exports = {
  ci: {
    collect: {
      url: [
        "http://127.0.0.1:3000/",
        "http://127.0.0.1:3000/auth/login",
        "http://127.0.0.1:3000/auth/signup",
      ],
      numberOfRuns: 3,
      settings: {
        chromeFlags: "--headless --no-sandbox --disable-dev-shm-usage",
      },
    },
    assert: {
      // REL-404 explicitly forbids inventing numeric SLOs. Collection failures
      // still fail the command; score thresholds are intentionally absent.
      assertions: {},
    },
    upload: {
      target: "filesystem",
      outputDir: "artifacts/lighthouse",
      reportFilenamePattern:
        "%%HOSTNAME%%-%%PATHNAME%%-%%DATETIME%%.report.%%EXTENSION%%",
    },
  },
};
