#!/usr/bin/env node
/**
 * Anchor guard for the Crescent Street Twin surface.
 *
 * The host twin surface may not honour a new-tab handoff. User-facing
 * external anchors must therefore:
 *   1. never carry target="_blank" (or any target attribute at all)
 *   2. carry an https:// href (no http, no javascript:, no relative)
 *
 * Runs against docs/app.js and any HTML under docs/. Exit non-zero on breach.
 */

const fs = require("fs");
const path = require("path");

const DOCS = path.join(__dirname, "..", "docs");
const failures = [];

function scanFile(file) {
  const src = fs.readFileSync(file, "utf8");
  // 1. any target="…" on an anchor (blank or otherwise) — forbidden
  const targetRe = /<a\b[^>]*\btarget\s*=/gi;
  let m;
  while ((m = targetRe.exec(src)) !== null) {
    const line = src.slice(0, m.index).split("\n").length;
    failures.push(`${path.relative(DOCS, file)}:${line}  target= on anchor`);
  }
  // 2. href values that are not https or in-page (#…) or mailto/tel
  //    Only checks static string literals; dynamic esc(...) hrefs are trusted
  //    to have been validated at the data layer.
  const hrefRe = /<a\b[^>]*\bhref\s*=\s*"([^"]+)"/gi;
  while ((m = hrefRe.exec(src)) !== null) {
    const href = m[1];
    if (href.startsWith("' + ") || href.includes("esc(")) continue; // template
    if (
      !href.startsWith("https://") &&
      !href.startsWith("#") &&
      !href.startsWith("mailto:") &&
      !href.startsWith("tel:")
    ) {
      const line = src.slice(0, m.index).split("\n").length;
      failures.push(`${path.relative(DOCS, file)}:${line}  non-https href: ${href}`);
    }
  }
}

function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (/\.(js|html)$/.test(entry.name)) scanFile(full);
  }
}

walk(DOCS);

if (failures.length) {
  console.error("Anchor guard FAILED — " + failures.length + " breach(es):");
  for (const f of failures) console.error("  " + f);
  process.exit(1);
}
console.log("Anchor guard passed: no target= on anchors, no non-https hrefs.");
