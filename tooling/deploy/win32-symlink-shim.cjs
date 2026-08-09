/**
 * OpenNext on Windows may hit EPERM on fs.symlinkSync — prefer junction, then cpSync.
 * Loaded via NODE_OPTIONS --require in cf-pages-*.cjs on win32 only.
 */
if (process.platform !== "win32") {
  module.exports = {};
} else {
  const fs = require("fs");
  const orig = fs.symlinkSync;
  fs.symlinkSync = function patchedSymlinkSync(target, linkPath, type) {
    try {
      const stat = fs.existsSync(target) ? fs.statSync(target) : null;
      const linkType =
        type || (stat && stat.isDirectory() ? "junction" : "file");
      return orig.call(fs, target, linkPath, linkType);
    } catch (err) {
      if (err && (err.code === "EPERM" || err.code === "EINVAL")) {
        fs.cpSync(target, linkPath, { recursive: true, force: true });
        return;
      }
      throw err;
    }
  };
}
