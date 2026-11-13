#!/usr/bin/env node

// Replace upstream/ with the VENDORED paths of cursor/plugins at a ref, path for path, and record the commit and each
// path's git object id. Leaves everything untouched when every path has the same object id as at the last sync, so
// commits elsewhere in cursor/plugins do not churn UPSTREAM.json.
// Usage: node scripts/sync-upstream.mjs [ref]   (default: main)

import { execFileSync } from "node:child_process";
import { cpSync, existsSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const UPSTREAM = join(ROOT, "upstream");
const RECORD = join(UPSTREAM, "UPSTREAM.json");
const REPO = "https://github.com/cursor/plugins.git";
const VENDORED = [
  "pstack",
  "cursor-team-kit/LICENSE",
  "cursor-team-kit/skills/control-cli",
  "cursor-team-kit/skills/control-ui",
  "cursor-team-kit/skills/deslop",
];
const ref = process.argv[2] ?? "main";
if (ref.startsWith("-")) throw new Error(`ref ${JSON.stringify(ref)} looks like a git option`);
const git = (cwd, ...args) => execFileSync("git", args, { cwd, encoding: "utf8" }).trim();

// github.com rate-limits anonymous git (HTTP 429), from shared Actions runners in particular. The fetch stays
// anonymous and retries after a pause instead; the daily schedule picks up anything a failed run missed.
const RETRY_AFTER_SECONDS = [30, 120];
function fetchWithRetry(cwd, ...args) {
  for (let attempt = 0; ; attempt++) {
    try {
      return git(cwd, ...args);
    } catch (error) {
      const limited = /\b429\b|rate-limited/.test(String(error.stderr));
      if (!limited || attempt >= RETRY_AFTER_SECONDS.length) throw error;
      console.log(`github.com rate-limited the fetch; retrying in ${RETRY_AFTER_SECONDS[attempt]}s`);
      Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, RETRY_AFTER_SECONDS[attempt] * 1000);
    }
  }
}

const tmp = mkdtempSync(join(tmpdir(), "pstack-upstream-"));
try {
  git(tmp, "init", "--quiet");
  git(tmp, "remote", "add", "origin", REPO);
  // Non-cone patterns, so a single file such as cursor-team-kit/LICENSE can be checked out.
  git(tmp, "sparse-checkout", "set", "--no-cone", ...VENDORED.map((path) => `/${path}`));
  // One request for the whole snapshot (about 6 MB). With --filter=blob:none the checkout fetched files on demand,
  // one request each, and drew far more 429s.
  fetchWithRetry(tmp, "fetch", "--quiet", "--depth", "1", "origin", ref);
  git(tmp, "checkout", "--quiet", "FETCH_HEAD");
  const commit = git(tmp, "rev-parse", "HEAD");
  const date = git(tmp, "show", "-s", "--format=%cI", "HEAD");
  const objects = {};
  for (const path of VENDORED) {
    try {
      objects[path] = git(tmp, "rev-parse", "--verify", "--quiet", `HEAD:${path}`);
    } catch {
      throw new Error(`${path} is not in cursor/plugins@${commit.slice(0, 12)}. Drop it from VENDORED in scripts/sync-upstream.mjs`);
    }
  }

  const previous = existsSync(RECORD) ? JSON.parse(readFileSync(RECORD, "utf8")) : undefined;
  const unchanged =
    previous?.objects !== undefined &&
    Object.keys(previous.objects).length === VENDORED.length &&
    VENDORED.every((path) => previous.objects[path] === objects[path]);
  if (unchanged) {
    console.log(`Every vendored path is unchanged since cursor/plugins@${previous.commit.slice(0, 12)}.`);
  } else {
    // A path dropped from VENDORED must not linger.
    for (const name of readdirSync(UPSTREAM)) {
      if (name !== "UPSTREAM.json") rmSync(join(UPSTREAM, name), { recursive: true, force: true });
    }
    for (const path of VENDORED) {
      cpSync(join(tmp, path), join(UPSTREAM, path), { recursive: true, verbatimSymlinks: true });
    }
    writeFileSync(
      RECORD,
      `${JSON.stringify({ repository: "https://github.com/cursor/plugins", ref, commit, date, objects }, null, 2)}\n`,
    );
    console.log(`upstream/ synced to cursor/plugins@${commit.slice(0, 12)} (${ref}). Run node scripts/generate-omp-tree.mjs next.`);
  }
} finally {
  rmSync(tmp, { recursive: true, force: true });
}
