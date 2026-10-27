#!/usr/bin/env node
// ═══════════════════════════════════════════════════════════════
// prepare-deploy-manifest.mjs
//
// Firebase Functions deploys by re-running `npm install` on Cloud Build
// against functions/package.json. pnpm's `workspace:*` protocol is not
// understood by npm there (EUNSUPPORTEDPROTOCOL), so we must not ship any
// `workspace:*` specifier in the uploaded manifest.
//
// Our only workspace dependency (@jewel998/api) is a BUILD-TIME devDependency
// that tsup bundles into dist/ (noExternal). The runtime `dependencies`
// (firebase-admin, firebase-functions) carry no workspace refs. So the deploy
// manifest simply drops devDependencies entirely — Cloud Build then installs
// only the real runtime deps.
//
// Usage:
//   node scripts/prepare-deploy-manifest.mjs strip     # back up + strip devDeps
//   node scripts/prepare-deploy-manifest.mjs restore    # restore original
//
// The `deploy` npm scripts wrap firebase deploy so the original manifest is
// always restored, even on failure.
// ═══════════════════════════════════════════════════════════════

import { copyFileSync, existsSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const pkgPath = join(here, "..", "package.json");
const backupPath = join(here, "..", "package.json.deploybak");

const mode = process.argv[2];

if (mode === "strip") {
  if (!existsSync(backupPath)) {
    copyFileSync(pkgPath, backupPath);
  }
  const pkg = JSON.parse(readFileSync(pkgPath, "utf8"));
  delete pkg.devDependencies;
  writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + "\n");
  console.log("[prepare-deploy-manifest] devDependencies stripped for deploy.");
} else if (mode === "restore") {
  if (existsSync(backupPath)) {
    copyFileSync(backupPath, pkgPath);
    rmSync(backupPath);
    console.log("[prepare-deploy-manifest] original package.json restored.");
  } else {
    console.log("[prepare-deploy-manifest] no backup found; nothing to restore.");
  }
} else {
  console.error("Usage: prepare-deploy-manifest.mjs <strip|restore>");
  process.exit(1);
}
