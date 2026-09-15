"use strict";

require("reflect-metadata");
const fs = require("node:fs");
const path = require("node:path");
const Module = require("node:module");

const nestRoot = path.resolve(__dirname, "..");
const ts = require(require.resolve("typescript", { paths: [nestRoot] }));
const origResolve = Module._resolveFilename;
const origTsExt = require.extensions[".ts"];
Module._resolveFilename = function (request, parent, isMain, options) {
  try {
    return origResolve.call(this, request, parent, isMain, options);
  } catch (err) {
    if (typeof request === "string" && request.startsWith(".") && !path.extname(request)) {
      const base = path.resolve(path.dirname(parent.filename), request);
      for (const ext of [".ts", ".js", ".cjs"]) {
        if (fs.existsSync(base + ext)) {
          return origResolve.call(this, request + ext, parent, isMain, options);
        }
      }
    }
    throw err;
  }
};

require.extensions[".ts"] = function (module, filename) {
  const source = fs.readFileSync(filename, "utf8");
  const compiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      experimentalDecorators: true,
      emitDecoratorMetadata: true,
      esModuleInterop: true,
      skipLibCheck: true,
    },
    fileName: filename,
  });
  module._compile(compiled.outputText, filename);
};

function uninstall() {
  Module._resolveFilename = origResolve;
  if (origTsExt) require.extensions[".ts"] = origTsExt;
  else delete require.extensions[".ts"];
}

module.exports = { transpile: ts.transpileModule, ts, nestRoot, uninstall };
