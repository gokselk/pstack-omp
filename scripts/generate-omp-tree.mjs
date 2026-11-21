#!/usr/bin/env node

// Generates the omp plugin tree (plugins/pstack), the omp marketplace catalog, and release.json from upstream/pstack,
// the four cursor-team-kit skills that pstack's playbooks run or name (deslop, control-cli, control-ui, verify-this),
// and the omp-owned skills in adapter/skills. The files in adapter/overlays replace the upstream files at their paths.
// Ported from cursor/plugins scripts/generate-pstack-harness-trees.mjs (the Claude Code tree).
// Usage: node scripts/generate-omp-tree.mjs [--check]
//
// The plugin version is `<upstream version>-omp.<n>`. `n` restarts at 1 when upstream's version changes and goes up
// by one whenever the generated content changes without it, so `omp plugin upgrade` sees every change.
// release.json records the version and a digest of the content it was cut from.

import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { chmodSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, posix, relative as nativeRelative, sep } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const UPSTREAM = join(ROOT, "upstream");
const PSTACK = join(UPSTREAM, "pstack");
// pstack's playbooks run deslop, control-cli, and control-ui from Cursor's cursor-team-kit plugin, which omp lacks, and
// control-ui names verify-this, which drives control-cli and control-ui. The tree ships all four beside pstack's own skills.
const KIT = "cursor-team-kit";
const SKILL_ROOTS = ["pstack", KIT];
// adapter/skills holds skills this fork writes for omp, such as its adaptation of Anthropic's skill-creator. They ship
// byte for byte: no adapter rows, no path rewrites, and no cursor/plugins link to fall back on.
const ADAPTER_ROOT = "adapter";
const ROOT_DIRS = { pstack: PSTACK, [KIT]: join(UPSTREAM, KIT), [ADAPTER_ROOT]: join(ROOT, "adapter") };
const AGENTS = join(PSTACK, "agents");
const ADAPTER_SOURCE = join(ROOT_DIRS[ADAPTER_ROOT], "omp.md");
// The adapter ships as a hidden skill so every skill, agent, and subagent reaches it by one URL, with no path to work out.
const ADAPTER_SKILL = "pstack-omp-adapter";
const ADAPTER = `skills/${ADAPTER_SKILL}/SKILL.md`;
const ADAPTER_FRONTMATTER = [
  "---",
  `name: ${ADAPTER_SKILL}`,
  "description: Maps the Cursor names in pstack skills and agents (Task, AskQuestion, subagent fields, model slugs, ~/.cursor paths) to omp. Read it before following a pstack skill in omp.",
  "disable-model-invocation: true",
  "---",
  "",
  "",
].join("\n");
const GUIDE = "docs/guide";
// The README and the guide are written for Cursor. The note under the H1 of the README, the guide's front page, and
// its setup page gives omp's install commands and command form, and names the Cursor-only steps omp skips.
const GUIDE_NOTE = "guide-note.md";
const GUIDE_NOTE_PAGES = ["README.md", `${GUIDE}/README.md`, `${GUIDE}/01-setup.md`];
const TREE = "plugins/pstack";
const OUT = join(ROOT, TREE);
const MARKETPLACE = ".omp-plugin/marketplace.json";
const MARKETPLACE_NAME = "pstack-omp";
const MARKETPLACE_OWNER = "Göksel Kabadayı";
const FORK = "https://github.com/gokselk/pstack-omp";
const RELEASE = "release.json";
const COMMAND = "node scripts/generate-omp-tree.mjs";
const GITHUB = "https://github.com/cursor/plugins";
// Upstream's Claude Code generator keys each Cursor name its skills use in its TERMS list, so a changed list is the
// signal to port the new names to adapter/omp.md and TERMS here. The sync vendors that script for this. Upstream's
// Claude Code adapter itself changes with every new default model, which adapter/omp.md does not mirror row for row.
const UPSTREAM_GENERATOR = join(UPSTREAM, "scripts/generate-pstack-harness-trees.mjs");
const UPSTREAM_TERMS_SHA256 = "a11c0e10a32674256565dcbc0f2d477920e70fcd43dcd636991b776c5fc66f2f";
// setup-pstack's rule block, whose role lines hold the default slugs. The adapter maps each one by name.
const DEFAULT_RULE = /^# budget:.*\n((?:[a-z][a-z ,-]*: .+\n)+)/m;
// The adapter routes to setup-pstack, poteto-mode, deslop, control-cli, control-ui, verify-this, and skill-creator, and
// the README names poteto-help.
const REQUIRED_SKILLS = ["setup-pstack", "poteto-mode", "poteto-help", "deslop", "control-cli", "control-ui", "verify-this", "skill-creator"];
// Upstream skills the tree leaves out, each with the reason. They are not copied, classified, or routed to, and a
// relative link to one points at cursor/plugins `main` like any other upstream file the tree lacks.
const DROPPED_SKILLS = {
  "make-bot-ui": "it builds a page whose buttons wake a Cursor Automation routine over api2.cursor.sh, and omp has no Cursor Automations",
};
// adapter/overlays mirrors tree paths. Each file there replaces the upstream file at its path byte for byte, with no
// adapter rows, path rewrites, or link fallback. Each is pinned to the sha256 of the upstream file it was ported from,
// so an upstream change to that file fails the build until it is ported.
const OVERLAYS_DIR = join(ROOT_DIRS[ADAPTER_ROOT], "overlays");
const OVERLAYS = {
  // Upstream's fills LAST_CHAT from Cursor transcripts, which omp never writes.
  "skills/poteto-mode/scripts/worktree-audit.sh": "06be04b38346ded24ce761d373726f98cd9b9737f20ec98214e88b5f08f521b8",
};
const LINK = /\]\(([^)\s]+)\)/g;

// Every Cursor name a skill uses needs a row in the omp adapter, and its key picks the rows a skill carries, so each
// key is the text of one row or a section heading. The keys are the upstream Claude Code generator's, with each value
// of `readonly` and `environment` keyed apart and its grok- and gpt- keys folded into gemini-, plus cursor-team-kit,
// whose skills pstack names and this tree ships, and Cursor's create-skill, /loop, Custom Modes, Plan Mode, Projects,
// and install commands, which the Claude Code tree leaves unmapped.
const TERMS = [
  { key: "`Task`", re: /`Task`|\bTask (tool|subagent|call)/ },
  { key: "`AskQuestion`", re: /AskQuestion/ },
  { key: "todolist", re: /\btodo ?list\b/i },
  { key: "generalPurpose", re: /generalPurpose/ },
  { key: "poteto-agent", re: /poteto-agent/ },
  { key: "comment-sicko", re: /comment-sicko/ },
  { key: "`readonly: true`", re: /readonly: true|readonly\/Ask|\breadonly (judge|subagent|agent|reviewer)s?\b/ },
  { key: "`readonly: false`", re: /readonly: false/ },
  { key: "`environment: \"cloud\"`", re: /environment: "cloud"/ },
  { key: "`environment: \"local\"`", re: /environment: "local"/ },
  { key: "cloud_base_branch", re: /cloud_base_branch/ },
  { key: "`run_in_background: true`", re: /run_in_background/ },
  { key: "`resume`", re: /`resume`/ },
  { key: "`file_attachments`", re: /file_attachments/ },
  { key: "claude-", re: /\bclaude-[a-z]+-\d/ },
  { key: "gemini-", re: /\b(gemini|grok|gpt)-\d/ },
  { key: "inherit-parent", re: /inherit-parent/ },
  { key: "pstack-models.mdc", re: /pstack-models\.mdc|`\/setup-pstack` rule/ },
  { key: ".cursor/skills/", re: /\.cursor\/skills/ },
  { key: "~/.cursor/plugins/", re: /\.cursor\/plugins|\.cursor-plugin/ },
  { key: ".cursor/rules/", re: /\.cursor\/rules|always-applied rule/ },
  { key: "agent-transcripts", re: /agent-transcripts|\.cursor\/projects/ },
  { key: "Cursor-only features", re: /Bugbot|Cursor [Aa]utomation|cursor\.(sh|com)\/automations|[Cc]loud [Aa]gent|built-in PR tool|Project workers?|Cursor Projects?/ },
  { key: "cursor-team-kit", re: /cursor-team-kit/ },
  { key: "create-skill", re: /create-skill/ },
  { key: "/loop", re: /`\/loop`|\/loop (until|\d)/ },
  { key: "Custom Mode", re: /Custom Modes?|custom modes?/ },
  { key: "Plan Mode", re: /Plan Mode/ },
  { key: "/add-plugin", re: /\/add-plugin|\/plugin install/ },
];
const ROUTE_KEY = "Run another pstack skill";
const SKILL_NAME = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function walk(dir) {
  return readdirSync(dir).flatMap((name) => {
    if (name === ".DS_Store" || name === "node_modules" || name === "__pycache__") return [];
    const path = join(dir, name);
    return statSync(path).isDirectory() ? walk(path) : [path];
  });
}

// Tree paths use `/` on every platform; Windows' `\` would miss every key and pin.
const relative = (from, to) => nativeRelative(from, to).split(sep).join("/");

// A Windows file system has no executable bit, so there a file's mode lives only in git's index. Stage a new
// executable with `git add --chmod=+x`; the sync and the generator do so for what they write.
const INDEX_MODES =
  process.platform === "win32"
    ? new Map(
        execFileSync("git", ["ls-files", "--stage", "-z"], { cwd: ROOT, encoding: "utf8" })
          .split("\0")
          .filter(Boolean)
          .map((line) => [line.slice(line.indexOf("\t") + 1), line.startsWith("100755 ")]),
      )
    : undefined;

function file(path) {
  const executable = INDEX_MODES ? INDEX_MODES.get(relative(ROOT, path)) === true : (statSync(path).mode & 0o111) !== 0;
  return { bytes: readFileSync(path), executable };
}

const text = (bytes) => Buffer.from(bytes).toString("utf8");
const sha256 = (path) => createHash("sha256").update(readFileSync(path)).digest("hex");
const upstreamSkillNames = new Set();
const skills = [...SKILL_ROOTS, ADAPTER_ROOT].flatMap((root) =>
  readdirSync(join(ROOT_DIRS[root], "skills"))
    .filter((name) => existsSync(join(ROOT_DIRS[root], "skills", name, "SKILL.md")))
    .filter((name) => {
      if (root === ADAPTER_ROOT) return true;
      upstreamSkillNames.add(name);
      return !Object.hasOwn(DROPPED_SKILLS, name);
    })
    .map((name) => ({ name, root })),
);
const skillNames = skills.map(({ name }) => name);
// A path under skills/<name>/ of a dropped upstream skill, relative to its root.
const isDropped = (root, path) => root !== ADAPTER_ROOT && /^skills\/[^/]+\//.test(path) && Object.hasOwn(DROPPED_SKILLS, path.split("/")[1]);
const skillDir = ({ name, root }) => join(ROOT_DIRS[root], "skills", name);
const rootOf = (path) => skills.find(({ name }) => `${path}/`.startsWith(`skills/${name}/`))?.root ?? "pstack";
const agents = readdirSync(AGENTS).filter((name) => name.endsWith(".md"));

// The adapter's `## ` sections: prose before the table, and the table's rows.
const adapter = readFileSync(ADAPTER_SOURCE, "utf8");
const sections = [];
for (const line of adapter.split("\n")) {
  if (line.startsWith("## ")) sections.push({ heading: line.slice(3).trim(), prose: [], rows: [] });
  else if (!sections.length) continue;
  else if (/^\| (Cursor \| omp|--- \| ---) \|$/.test(line)) continue;
  else if (line.startsWith("| ")) sections.at(-1).rows.push(line);
  else sections.at(-1).prose.push(line);
}
const paragraphs = (lines) => lines.join("\n").trim();

// The rows are the translation, with one exception: the adapter's "Rewritten paths" table is applied to the text of
// every skill and agent. A row is advice the model weighs against the skill's own words, and for a folder to write
// to it lost: with rows alone, Sonnet 5 named `.cursor/skills/` as the place for a skill edit in 6 of 15 runs,
// and in 0 of 26 once the text itself named the omp folder. Add a pair there only for a path a test run shows a
// model copying. MAINTAINING.md has the numbers.
const REWRITE_SECTION = "Rewritten paths";
const rewrites = (sections.find((section) => section.heading === REWRITE_SECTION)?.rows ?? [])
  .map((row) => row.match(/^\| `([^`]+)` \| `([^`]+)` \|$/)?.slice(1) ?? [row])
  .sort(([a], [b]) => b.length - a.length);

// Bundled skills arrive with pstack, so they must not auto-trigger in sessions that don't use pstack. A kit skill ships
// with `disable-model-invocation: true` as the last line of its frontmatter, unless it already sets the field.
const HIDDEN = /^disable-model-invocation:/m;
const hidden = (body) => {
  const match = body.match(/^---\n([\s\S]*?)\n---/);
  return !match || HIDDEN.test(match[1]) ? body : `---\n${match[1]}\ndisable-model-invocation: true${body.slice(match[0].length - 4)}`;
};
// Upstream pins agents to a Cursor slug such as `claude-opus-5-5-xhigh-fast`. omp reads an agent's `model:` as an omp
// selector, resolves that slug to its Cursor provider, and runs the agent there or on the session model, depending on
// the user's Cursor login. Without the line, an agent runs on the session model unless the call passes an approved
// per-call `model`, as every other omp subagent does.
const unpinned = (body) => body.replace(/^---\n[\s\S]*?\n---/, (frontmatter) => frontmatter.replace(/^model:.*\n/m, ""));
const rewritten = new Set();
function source(path) {
  return rewrites.reduce((body, [from, to]) => {
    if (to === undefined || !body.includes(from)) return body;
    rewritten.add(from);
    return body.replaceAll(from, to);
  }, readFileSync(path, "utf8"));
}

// Cursor names used in `paths`, and whether `entry` has an H1 to put the adapter rows under.
function classify(paths, entry, self) {
  const others = skillNames.filter((name) => name !== self).join("|");
  const route = new RegExp(`the \\*\\*(?<bold>${others})\\*\\* skill|\`/(?<command>${others})\``, "g");
  const linksToSkill = (line, name) => line.includes(`(../${name}/`);
  const namesBareSkill = (line) =>
    [...line.matchAll(route)].some(({ groups }) => !linksToSkill(line, groups.bold ?? groups.command));
  const usesCursorNames = new Set();
  for (const path of paths) {
    const body = source(path);
    for (const term of TERMS) if (term.re.test(body)) usesCursorNames.add(term.key);
    if (body.split("\n").some(namesBareSkill)) usesCursorNames.add(ROUTE_KEY);
  }
  const wrap = usesCursorNames.size > 0 && /^# /m.test(source(entry));
  return { usesCursorNames, wrap };
}

const classes = new Map([
  ...skills.filter(({ root }) => root !== ADAPTER_ROOT).map((skill) => {
    const dir = skillDir(skill);
    const md = walk(dir).filter((path) => path.endsWith(".md"));
    return [
      `skills/${skill.name}/SKILL.md`,
      { ...classify(md, join(dir, "SKILL.md"), skill.name), name: skill.name, what: "skill" },
    ];
  }),
  ...agents.map((agent) => {
    const path = join(AGENTS, agent);
    return [`agents/${agent}`, { ...classify([path], path), name: agent.replace(/\.md$/, ""), what: "prompt" }];
  }),
]);

// Each skill and agent carries the adapter rows for the Cursor names it uses, because models rarely open a separate
// adapter file. A key matches the rows that contain it, or a whole section by heading; a section named after the
// skill, such as setup-pstack, rides along whole.
function mappingFor({ usesCursorNames, name, what }) {
  const picked = new Set();
  const missing = [];
  for (const key of usesCursorNames) {
    const hits = sections.flatMap((section) =>
      section.heading === key ? section.rows : section.rows.filter((row) => row.includes(key)),
    );
    if (hits.length === 0) missing.push(key);
    for (const row of hits) picked.add(row);
  }
  const used = sections.filter((section) => section.rows.some((row) => picked.has(row)));
  const own = sections.find((section) => section.heading === name);
  const block = [
    `In omp, map the Cursor names in this ${what} with these rows. \`skill://${ADAPTER_SKILL}\` has the full map. ` +
      "If a Cursor field has no row in either, drop it and say so. Never pass a field or value the tool schema rejects. " +
      "Write the omp name, never the Cursor one, in replies, briefs, and questions to the user.",
    ...used.map((section) => paragraphs(section.prose)).filter(Boolean),
    ["| Cursor | omp |", "| --- | --- |", ...used.flatMap((section) => section.rows.filter((row) => picked.has(row)))].join("\n"),
    ...(own ? [paragraphs(own.prose)] : []),
  ];
  return { text: block.join("\n\n"), missing };
}

const problems = [];
const users = new Map();
for (const [path, { usesCursorNames, wrap }] of classes) {
  if (usesCursorNames.size > 0 && !wrap) problems.push(`${path} uses Cursor names but has no H1`);
  for (const key of usesCursorNames) users.set(key, [...(users.get(key) ?? []), path]);
}
for (const [index, skill] of skills.entries()) {
  const folder = relative(ROOT, skillDir(skill));
  const twin = skills.slice(0, index).find(({ name }) => name === skill.name);
  if (twin) problems.push(`${folder} and ${relative(ROOT, skillDir(twin))} both want skills/${skill.name}`);
  if (skill.name === ADAPTER_SKILL) problems.push(`${folder} takes skills/${ADAPTER_SKILL}, which the omp adapter needs`);
  // omp lists a plugin skill by its frontmatter `name`; Cursor runs it by its folder name.
  const frontmatter = readFileSync(join(skillDir(skill), "SKILL.md"), "utf8").match(/^---\n([\s\S]*?)\n---/)?.[1] ?? "";
  const name = frontmatter.match(/^name:(.*)$/m)?.[1].trim().replace(/^(["'])(.*)\1$/, "$2");
  if (name !== skill.name) problems.push(`${folder}/SKILL.md has name ${JSON.stringify(name ?? "")}, not its folder name ${skill.name}`);
  if (!SKILL_NAME.test(skill.name) || skill.name.length > 64) problems.push(`${folder} is not lowercase words joined by hyphens, at most 64 characters`);
}
for (const skill of REQUIRED_SKILLS) {
  if (Object.hasOwn(DROPPED_SKILLS, skill)) problems.push(`${skill} is in DROPPED_SKILLS, but the omp tree points users or agents at it. Delete it from DROPPED_SKILLS or REQUIRED_SKILLS`);
  else if (!skillNames.includes(skill)) problems.push(`skills/${skill} is gone, but the omp tree points users or agents at it`);
}
for (const name of Object.keys(DROPPED_SKILLS)) {
  if (!upstreamSkillNames.has(name)) problems.push(`${name} is gone upstream. Delete it from DROPPED_SKILLS`);
}
const upstreamTerms = existsSync(UPSTREAM_GENERATOR)
  ? readFileSync(UPSTREAM_GENERATOR, "utf8").match(/^const TERMS = \[\n[\s\S]*?^\];$/m)?.[0]
  : undefined;
const upstreamTermsHash = upstreamTerms && createHash("sha256").update(upstreamTerms).digest("hex");
if (upstreamTerms === undefined) {
  problems.push(`upstream/${relative(UPSTREAM, UPSTREAM_GENERATOR)} has no TERMS list. Find where upstream now keys its Cursor names`);
} else if (upstreamTermsHash !== UPSTREAM_TERMS_SHA256) {
  problems.push(
    `upstream changed TERMS in upstream/${relative(UPSTREAM, UPSTREAM_GENERATOR)} (sha256 ${upstreamTermsHash}). Port its new Cursor names to adapter/omp.md and TERMS, then update UPSTREAM_TERMS_SHA256`,
  );
}
const defaultRule = readFileSync(join(PSTACK, "skills/setup-pstack/SKILL.md"), "utf8").match(DEFAULT_RULE)?.[1];
if (defaultRule === undefined) problems.push("skills/setup-pstack/SKILL.md has no `# budget:` line followed by role lines");
const defaultSlugs = new Set(
  (defaultRule ?? "")
    .split("\n")
    .flatMap((line) => line.slice(line.indexOf(": ") + 2).split(","))
    .map((slug) => slug.trim())
    .filter((slug) => slug && slug !== "inherit-parent" && slug !== "auto"),
);
for (const slug of defaultSlugs) {
  if (!adapter.includes(`\`${slug}\``)) problems.push(`setup-pstack defaults to ${slug}, which adapter/omp.md does not map. Add it to the setup-pstack Defaults line`);
}
for (const page of GUIDE_NOTE_PAGES) {
  const path = join(PSTACK, page);
  if (!existsSync(path)) problems.push(`${page} is gone, but adapter/${GUIDE_NOTE} goes under its H1. Update GUIDE_NOTE_PAGES`);
  else if (!/^# /m.test(readFileSync(path, "utf8"))) problems.push(`${page} has no H1 to put adapter/${GUIDE_NOTE} under`);
}
const overlays = existsSync(OVERLAYS_DIR) ? walk(OVERLAYS_DIR).map((path) => relative(OVERLAYS_DIR, path)) : [];
for (const path of overlays) {
  if (!Object.hasOwn(OVERLAYS, path)) problems.push(`adapter/overlays/${path} has no pin. Add the sha256 of the upstream file it replaces to OVERLAYS`);
}
for (const [path, pin] of Object.entries(OVERLAYS)) {
  const root = rootOf(path);
  const upstreamFile = join(ROOT_DIRS[root], path);
  if (!overlays.includes(path)) problems.push(`OVERLAYS pins ${path}, but adapter/overlays/${path} is gone. Delete the pin`);
  else if (root === ADAPTER_ROOT || isDropped(root, path) || !existsSync(upstreamFile)) {
    problems.push(`adapter/overlays/${path} has no upstream file to replace. Delete it and its pin`);
  } else {
    const hash = sha256(upstreamFile);
    if (hash !== pin) problems.push(`upstream changed ${path} (sha256 ${hash}). Port the change into adapter/overlays/${path}, then update its pin`);
  }
}
// omp orders `<version>-omp.<n>` as a semver prerelease, which only works when upstream's version is a plain release.
const upstreamManifest = JSON.parse(readFileSync(join(PSTACK, "plugin.json"), "utf8"));
if (!/^\d+\.\d+\.\d+$/.test(upstreamManifest.version)) {
  problems.push(`plugin.json version ${JSON.stringify(upstreamManifest.version)} is not MAJOR.MINOR.PATCH`);
}
for (const [path, entry] of classes) {
  if (!entry.wrap) continue;
  const { missing } = mappingFor(entry);
  for (const key of missing) problems.push(`adapter/omp.md has no row or section for ${key}, used by ${path}`);
}
for (const [from, to] of rewrites) {
  if (to === undefined) problems.push(`adapter/omp.md "${REWRITE_SECTION}" row is not two code spans: ${from}`);
  else if (!rewritten.has(from)) problems.push(`adapter/omp.md "${REWRITE_SECTION}" row ${from} matches nothing upstream. Delete the row`);
}
for (const problem of problems) console.log(`FAIL ${problem}`);
if (problems.length > 0) process.exit(1);

// The root-relative path that a relative link in `from` points at, if that path exists in `from`'s upstream root. An
// adapter skill has no upstream copy, so every relative link in it counts.
function resolve(from, href) {
  const target = href.replace(/[#?].*/, "");
  if (!target || /^[a-z][a-z0-9+.-]*:/i.test(target)) return undefined;
  const path = posix.join(posix.dirname(from), target).replace(/\/$/, "");
  const root = rootOf(from);
  return root === ADAPTER_ROOT || existsSync(join(ROOT_DIRS[root], path)) ? path : undefined;
}

// One tree path can come from either root, such as `LICENSE` from a kit skill, so a link stays relative only when its
// target came from the link's own root.
function has(files, from, path) {
  if (rootOf(path) !== rootOf(from)) return false;
  return files.has(path) || [...files.keys()].some((key) => key.startsWith(`${path}/`));
}

// Agent Plugins 1.0.0 (`$schema`) makes omp validate SKILL.md frontmatter against the closed Agent Skills
// field set, which rejects `disable-model-invocation` and `paths` and drops 62 of 63 skills. Without `$schema`,
// omp loads the tree through its Claude-compatible provider, which keeps both fields and hides the user-invoked
// skills from the model's catalog. `.omp-plugin/plugin.json` also marks the agents' `model:` as omp selectors.
const { $schema: _schema, ...upstreamFields } = upstreamManifest;
// This package is the fork's: upstream's author keeps the copyright in LICENSE, and the README credits upstream.
const manifest = { ...upstreamFields, author: { name: MARKETPLACE_OWNER }, homepage: FORK, repository: FORK };

function render() {
  const copies = [
    ...[...SKILL_ROOTS, ADAPTER_ROOT].flatMap((root) =>
      walk(join(ROOT_DIRS[root], "skills"))
        .filter((path) => !isDropped(root, relative(ROOT_DIRS[root], path)))
        .map((path) => [root, path]),
    ),
    ...[...walk(AGENTS), ...walk(join(PSTACK, GUIDE)), join(PSTACK, "README.md")].map((path) => ["pstack", path]),
  ];
  const files = new Map(
    copies.map(([root, path]) => {
      const key = relative(ROOT_DIRS[root], path);
      const isPrompt = root !== ADAPTER_ROOT && /^(skills|agents)\/.*\.md$/.test(key);
      if (!isPrompt) return [key, file(path)];
      const body = source(path);
      const hide = root === KIT && /^skills\/[^/]+\/SKILL\.md$/.test(key);
      const agent = /^agents\/[^/]+\.md$/.test(key);
      return [key, { ...file(path), bytes: Buffer.from(hide ? hidden(body) : agent ? unpinned(body) : body) }];
    }),
  );
  files.set(ADAPTER, { bytes: Buffer.from(ADAPTER_FRONTMATTER + adapter), executable: false });
  const underH1 = (path, block) => {
    files.get(path).bytes = Buffer.from(text(files.get(path).bytes).replace(/^(# .*)\n+/m, (_, h1) => `${h1}\n\n${block}\n\n`));
  };
  for (const [path, entry] of classes) if (entry.wrap) underH1(path, mappingFor(entry).text);
  const guideNote = readFileSync(join(ROOT_DIRS[ADAPTER_ROOT], GUIDE_NOTE), "utf8").trim();
  for (const page of GUIDE_NOTE_PAGES) underH1(page, guideNote);
  files.set("LICENSE", file(join(PSTACK, "LICENSE")));
  // cursor-team-kit is Cursor's copyright, not pstack's, so each of its skills carries the kit's LICENSE.
  for (const { name, root } of skills) {
    if (root === KIT) files.set(`skills/${name}/LICENSE`, file(join(UPSTREAM, KIT, "LICENSE")));
  }
  for (const [path, entry] of files) {
    if (!path.endsWith(".md") || rootOf(path) === ADAPTER_ROOT) continue;
    entry.bytes = Buffer.from(
      text(entry.bytes).replace(LINK, (link, href) => {
        const target = resolve(path, href);
        if (!target || target.split("/")[0] === ".." || has(files, path, target)) return link;
        const root = rootOf(path);
        const kind = statSync(join(UPSTREAM, root, target)).isDirectory() ? "tree" : "blob";
        return `](${GITHUB}/${kind}/main/${root}/${target}${href.slice(href.search(/[#?]|$/))})`;
      }),
    );
  }
  for (const path of Object.keys(OVERLAYS)) files.set(path, file(join(OVERLAYS_DIR, path)));
  return files;
}

// omp installs only the tree, so a relative link that works from upstream/ has to work inside the tree too.
const files = render();
const dangling = [];
for (const [path, entry] of files) {
  if (!path.endsWith(".md")) continue;
  for (const [, href] of text(entry.bytes).matchAll(LINK)) {
    const target = resolve(path, href);
    if (!target) continue;
    const folder = path.split("/").slice(0, 2).join("/");
    if (rootOf(path) === ADAPTER_ROOT && !target.startsWith(`${folder}/`)) {
      dangling.push(`${TREE}/${path} links to ${href}, outside ${folder}. An adapter skill ships byte for byte, so its links stay in its folder`);
    } else if (!has(files, path, target)) dangling.push(`${TREE}/${path} links to ${href}, which is not in the tree`);
  }
}
// omp also runs on Windows, where a clone cannot check out these names. Upstream syncs land unreviewed, so every
// file of the vendored copy and of the tree is checked here.
const WINDOWS_RESERVED = /[<>:"|?*\\\x00-\x1f]|[. ]$|^(con|prn|aux|nul|com[1-9]|lpt[1-9])(\.|$)/i;
const byLowercase = new Map();
for (const path of [...walk(UPSTREAM).map((path) => relative(ROOT, path)), ...[...files.keys()].map((path) => `${TREE}/${path}`)]) {
  if (path.split("/").some((segment) => WINDOWS_RESERVED.test(segment))) dangling.push(`${path} is not a file name Windows allows`);
  const twin = byLowercase.get(path.toLowerCase());
  if (twin) dangling.push(`${path} and ${twin} differ only by case, which Windows cannot hold together`);
  byLowercase.set(path.toLowerCase(), path);
}
for (const { name, root } of skills) {
  const frontmatter = text(files.get(`skills/${name}/SKILL.md`).bytes).match(/^---\n([\s\S]*?)\n---/)?.[1] ?? "";
  if (root !== "pstack" && !/^disable-model-invocation:\s*true\s*$/m.test(frontmatter)) {
    dangling.push(`skills/${name} is bundled from ${root}, so it must ship with disable-model-invocation: true`);
  }
}
for (const link of dangling) console.log(`FAIL ${link}`);
if (dangling.length > 0) process.exit(1);

const json = (value) => ({ bytes: Buffer.from(`${JSON.stringify(value, null, 2)}\n`), executable: false });

function outputsFor(version) {
  const catalog = {
    name: MARKETPLACE_NAME,
    owner: { name: MARKETPLACE_OWNER },
    metadata: { description: "pstack (cursor/plugins) packaged for omp" },
    plugins: [
      {
        name: manifest.name,
        source: `./${TREE}`,
        description: manifest.description,
        // omp resolves an install's version from the catalog first, and `omp plugin upgrade` compares only catalog versions.
        version,
        author: manifest.author,
        license: manifest.license,
        keywords: manifest.keywords,
      },
    ],
  };
  const outputs = new Map([...files].map(([path, entry]) => [`${TREE}/${path}`, entry]));
  outputs.set(`${TREE}/.omp-plugin/plugin.json`, json({ ...manifest, version }));
  outputs.set(MARKETPLACE, json(catalog));
  return outputs;
}

function digestOf(outputs) {
  const hash = createHash("sha256");
  for (const path of [...outputs.keys()].sort()) {
    const { bytes, executable } = outputs.get(path);
    hash.update(`${path}\0${executable}\0${bytes.length}\0`).update(bytes);
  }
  return hash.digest("hex");
}

const digest = digestOf(outputsFor(""));
// Without release.json, continue from the catalog's version so `n` never goes back to a version already published.
const readJson = (path) => (existsSync(join(ROOT, path)) ? JSON.parse(readFileSync(join(ROOT, path), "utf8")) : undefined);
const previous = readJson(RELEASE) ?? { version: readJson(MARKETPLACE)?.plugins?.[0]?.version };
const [, previousUpstream, previousN] =
  (typeof previous.version === "string" && previous.version.match(/^(.*)-omp\.(\d+)$/)) || [];
const n =
  previousUpstream !== manifest.version ? 1 : previous.digest === digest ? Number(previousN) : Number(previousN) + 1;
const version = `${manifest.version}-omp.${n}`;
const outputs = outputsFor(version);
outputs.set(RELEASE, json({ version, upstreamVersion: manifest.version, digest }));

if (process.argv.includes("--check")) {
  const onDisk = new Map(existsSync(OUT) ? walk(OUT).map((path) => [relative(ROOT, path), file(path)]) : []);
  for (const path of [MARKETPLACE, RELEASE]) if (existsSync(join(ROOT, path))) onDisk.set(path, file(join(ROOT, path)));
  const drifted = [...new Set([...outputs.keys(), ...onDisk.keys()])].sort().filter((path) => {
    const [want, have] = [outputs.get(path), onDisk.get(path)];
    return !want || !have || !want.bytes.equals(have.bytes) || want.executable !== have.executable;
  });
  for (const path of drifted.slice(0, 20)) console.log(path);
  if (drifted.length > 0) {
    console.log(`${TREE} is out of date. Run \`${COMMAND}\` and commit the result.`);
    process.exit(1);
  }
  console.log(`${TREE} is up to date.`);
} else {
  rmSync(OUT, { recursive: true, force: true });
  for (const [path, { bytes, executable }] of outputs) {
    mkdirSync(dirname(join(ROOT, path)), { recursive: true });
    writeFileSync(join(ROOT, path), bytes);
    chmodSync(join(ROOT, path), executable ? 0o755 : 0o644);
  }
  if (INDEX_MODES) {
    // An untracked file gets mode 100644 from `git add`, and a tracked one keeps its index mode.
    for (const [flag, want] of [["+x", true], ["-x", false]]) {
      const paths = [...outputs]
        .filter(([path, { executable }]) => executable === want && (INDEX_MODES.get(path) ?? false) !== want)
        .map(([path]) => path);
      if (paths.length > 0) execFileSync("git", ["add", `--chmod=${flag}`, "--", ...paths], { cwd: ROOT });
    }
  }
  const wrapped = [...classes].filter(([, { wrap }]) => wrap);
  const count = (prefix) => wrapped.filter(([path]) => path.startsWith(prefix)).length;
  console.log(
    `${version}: ${skills.length} skills, ${count("skills/")} SKILL.md files and ${count("agents/")} agents with adapter rows`,
  );
}
