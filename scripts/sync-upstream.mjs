#!/usr/bin/env node

// Replace upstream/pstack with pstack/ from cursor/plugins at a ref, and record the commit.
// Leaves everything untouched when pstack/ has the same git tree as the last sync, so commits elsewhere in
// cursor/plugins do not churn UPSTREAM.json.
// Usage: node scripts/sync-upstream.mjs [ref]   (default: main)

import { execFileSync } from "node:child_process";
import { cpSync, existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const RECORD = join(ROOT, "upstream", "UPSTREAM.json");
const REPO = "https://github.com/cursor/plugins.git";
const ref = process.argv[2] ?? "main";
if (ref.startsWith("-")) throw new Error(`ref ${JSON.stringify(ref)} looks like a git option`);
const git = (cwd, ...args) => execFileSync("git", args, { cwd, encoding: "utf8" }).trim();

const tmp = mkdtempSync(join(tmpdir(), "pstack-upstream-"));
try {
  git(tmp, "init", "--quiet");
  git(tmp, "remote", "add", "origin", REPO);
  git(tmp, "sparse-checkout", "set", "pstack");
  // One request for the whole snapshot (about 6 MB). With --filter=blob:none the checkout fetched files on demand,
  // and from a shared GitHub Actions runner those requests got HTTP 429.
  git(tmp, "fetch", "--quiet", "--depth", "1", "origin", ref);
  git(tmp, "checkout", "--quiet", "FETCH_HEAD");
  const commit = git(tmp, "rev-parse", "HEAD");
  const date = git(tmp, "show", "-s", "--format=%cI", "HEAD");
  const tree = git(tmp, "rev-parse", "HEAD:pstack");

  const previous = existsSync(RECORD) ? JSON.parse(readFileSync(RECORD, "utf8")) : undefined;
  if (previous?.tree === tree) {
    console.log(`upstream/pstack is already at tree ${tree.slice(0, 12)} (cursor/plugins@${previous.commit.slice(0, 12)}).`);
  } else {
    const dest = join(ROOT, "upstream", "pstack");
    rmSync(dest, { recursive: true, force: true });
    cpSync(join(tmp, "pstack"), dest, { recursive: true, verbatimSymlinks: true });
    writeFileSync(
      RECORD,
      `${JSON.stringify({ repository: "https://github.com/cursor/plugins", path: "pstack", ref, commit, date, tree }, null, 2)}\n`,
    );
    console.log(`upstream/pstack synced to cursor/plugins@${commit.slice(0, 12)} (${ref}). Run node scripts/generate-omp-tree.mjs next.`);
  }
} finally {
  rmSync(tmp, { recursive: true, force: true });
}
