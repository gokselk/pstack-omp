# maintaining pstack for omp

## what differs from upstream

[The omp adapter](adapter/omp.md) maps each Cursor name in pstack to omp: `Task` to `task`, `AskQuestion` to `ask`, Cursor model slugs to `provider/model-id:effort` selectors, `~/.cursor/...` paths to `~/.omp/...`, and so on. It ships as the hidden skill `pstack-omp-adapter`.

The tree also ships `deslop`, `control-cli`, `control-ui`, and `verify-this` from cursor-team-kit, Cursor's own plugin in cursor/plugins. pstack's playbooks run `deslop` before every commit and a control skill when shipping a CLI or UI, and omp users have no cursor-team-kit. `control-ui` names `verify-this`, which drives `control-cli` and `control-ui` for before and after evidence, so it ships too. The four are MIT with Cursor's copyright, not pstack's, so each skill folder carries cursor-team-kit's `LICENSE`. They use no Cursor name today, so their `SKILL.md` ships byte for byte. An adapter row tells the pstack skills that name cursor-team-kit that all four are already installed.

The tree also ships `skill-creator`, from anthropics/skills at commit `2c5958ecac7cee2b583967a2c4981d0f4a75c579`. pstack's skills hand skill authoring to Cursor's built-in `create-skill`, which omp lacks, and an adapter row sends them to `skill-creator` instead. It is a copy adapted by hand in `adapter/skills/skill-creator/`, and the daily sync does not touch it. Its test runs use omp's `task` tool, and its trigger check and description optimization run on `omp -p`. It is Apache-2.0, so `LICENSE.txt` stays beside its `SKILL.md`, and each file changed from upstream says so in a notice near its top. To update it, diff upstream's `skills/skill-creator/` from that commit to the new one, port the changes by hand, keep the notices, and record the new commit here. The generator ships every folder in `adapter/skills/` byte for byte, with no adapter rows, path rewrites, or link fallback.

The other skills and agents are upstream's, cursor-team-kit's included, apart from three generated changes:

- Each skill or agent that uses Cursor names gets, under its H1, the adapter rows for the names it uses. The rows sit in the skill because models rarely open a separate adapter file.
- The paths in the adapter's "Rewritten paths" table are swapped in the text. Today those are `.cursor/skills/` and `~/.cursor/skills/`.
- A relative link to an upstream file the tree leaves out, such as `docs/harness/claude-code.md`, points at that file on cursor/plugins `main` instead. A link resolves against the upstream folder its file came from, `pstack/` or `cursor-team-kit/`.

### rows first, and a rewrite only where a row loses

A row can carry a rule, such as "leave `model` out unless per-call models are on". A text rewrite cannot, so rows are the default, and every mapping lives in `adapter/omp.md`. A row is still advice that the model weighs against the skill's own words. Where test runs show the row losing, the path moves to the "Rewritten paths" table and the generator swaps it in the text. The generator fails when a row of that table matches nothing upstream.

Measured with `omp -p` on Sonnet 5, as passes out of runs:

| check | before | now | what changed |
| --- | --- | --- | --- |
| a delegate's first `task` call carries `agent: "poteto-agent"` | 1/7 | 21/21 | The rows say to write `agent` as the first key of the item. Sonnet 5 wrote the long `task` text first and then left `agent` out. A higher thinking level did not help (1/4). |
| `reflect` names an omp folder, not `.cursor/skills/`, for a skill edit | 9/15 | 26/26 | The two paths are rewritten in the text. A reminder at the end of the skill did not help: 3 of its 6 runs still named `.cursor/skills/`. |
| `reflect` finds its transcript without listing other workspaces' session folders | 19/30 | 16/16 | The row gives `$PI_SESSION_FILE` as the only way and forbids listing session folders. |
| `reflect` sends no `model` while per-call models are off | | 36/38 | Unchanged. In the 2 misses omp rejected the call and the model sent it again without `model`. |

On Opus 5.5 the same tree passed 2 of 2 delegation runs and 2 of 2 full `reflect` runs. Rewriting tool and field names in the text (`` `Task` `` to `` `task` ``, `subagent_type` to `agent`) was also tried and changed nothing: 0 of 3 delegation runs set `agent`, the same as without it.

The tree has no Agent Plugins `$schema` in its manifest. With it, omp validates every `SKILL.md` against the closed Agent Skills field set (`name`, `description`, `license`, `allowed-tools`, `metadata`, `compatibility`), so upstream's `disable-model-invocation: true` rejects 57 of the 62 skills. None of those six fields hides a skill. Without `$schema`, omp loads the tree through its Claude-compatible provider: all 62 skills load, and the 57 user-invoked ones stay out of the model's catalog while `/skill:<name>` and `skill://<name>` still reach them. The manifest sits at `.omp-plugin/plugin.json`, so omp also reads any agent `model:` as an omp selector.

Per-role models need `task.perCallModel: on` and each model named by a `modelRoles` entry in user settings. `/skill:setup-pstack` offers that block and writes it after the user confirms. Without it, subagents run on their configured model.

## smoke testing

`--check` proves the tree is generated, not that models follow it. After an adapter or generator change, run a few skills in a scratch repo against the working tree, for example `omp -p --plugin-dir plugins/pstack --auto-approve "read skill://poteto-mode and follow it: <small feature>. Delegate the implementation to one subagent."`, and a small fix followed by `omp -p -c` with `read skill://reflect and follow it`. Run each several times: single runs hid every problem in the table above. Read the session `.jsonl`: check that the first `task` call carries `agent: "poteto-agent"`, that `reflect` reads `$PI_SESSION_FILE` and lists no other session folder, that no `task` call is rejected, and that replies name omp paths, not Cursor ones. `omp -p` passes `/skill:<name>` through as plain text, so ask for the `read` explicitly there. Tell the run not to write files outside the scratch repo, since `setup-pstack` and `reflect` edit user config and skills.

## layout

| path | what |
| --- | --- |
| `upstream/pstack/` | `pstack/` from cursor/plugins, unedited. |
| `upstream/cursor-team-kit/` | `LICENSE` and the `deslop`, `control-cli`, `control-ui`, and `verify-this` skills from cursor/plugins `cursor-team-kit/`, unedited. |
| `upstream/UPSTREAM.json` | the cursor/plugins commit, and the git object id of each vendored path. |
| `adapter/omp.md` | the omp adapter, shipped as `skills/pstack-omp-adapter/SKILL.md`. Edit this one. |
| `adapter/skills/` | skills written for omp, such as the adapted `skill-creator`, shipped byte for byte as `skills/<name>/`. Edit these. |
| `plugins/pstack/` | the generated plugin that omp installs. Do not edit it by hand. |
| `.omp-plugin/marketplace.json` | the generated catalog. |
| `release.json` | the generated version, `<upstream version>-omp.<n>`, and the digest of the content it was cut from. |

## windows

omp runs on Windows, and the plugin is built to work there. None of this has been run on Windows.

- `.gitattributes` turns line-ending conversion off. With `core.autocrlf`, a clone would otherwise give the skills' shell scripts CRLF line endings, which break them.
- The adapter ships no script of its own. A transcript is found through `$PI_SESSION_FILE`, which omp sets for every `bash` call.
- The generator fails on a file name Windows cannot check out: a reserved character or device name, a trailing dot or space, or two names that differ only by case. The longest path in the plugin is 98 characters, which leaves room under the 260-character limit after omp's cache folder.
- Upstream's own scripts (`worktree-audit.sh`, `log.sh`, `watch-pr`, `statechart`) are POSIX shell or start with a `#!` line. omp runs `bash` commands in its built-in shell on Windows too, but whether each script works there is untested.
- `skill-creator`'s `run_eval.py` reads `omp -p` output with `select`, as upstream's version does, and Python on Windows supports `select` only for sockets. There every query of its trigger check errors and counts as not triggered, so `run_loop.py` measures nothing.

## versions

`n` restarts at 1 when upstream's version changes and goes up by one whenever the generated content changes without it, such as an adapter edit or an upstream change that kept its version. `omp plugin upgrade` orders these as semver prereleases, so `0.15.36-omp.2` upgrades `0.15.36-omp.1` and `0.15.37-omp.1` upgrades both. That ordering needs upstream's version to be `MAJOR.MINOR.PATCH`, and the generator fails otherwise. Regenerating with no change keeps the version, so commit once per change: each regeneration with different content takes a new `n`. If `release.json` is lost, the generator continues from the catalog's version rather than going back to `-omp.1`.

## sync with upstream

`.github/workflows/sync-upstream.yml` runs daily at 06:17 UTC, and on demand from the Actions tab with an optional cursor/plugins ref. It syncs `upstream/`, regenerates the tree, and pushes a commit to `main` when anything changed. `VENDORED` in `scripts/sync-upstream.mjs` lists the cursor/plugins paths that `upstream/` mirrors, path for path. `upstream/UPSTREAM.json` records the repository, the ref, the commit and its date, and under `objects` the git object id of each listed path, a tree for a folder and a blob for a file. A sync compares those ids and is a no-op while every one matches, so commits elsewhere in cursor/plugins do not churn the repo. Otherwise it replaces everything in `upstream/` except `UPSTREAM.json`, so a path dropped from `VENDORED` goes away. To vendor another cursor-team-kit skill, add its folder to `VENDORED` and run the sync. The generator picks up every skill in `upstream/cursor-team-kit/skills/`. The workflow requests `contents: write` for the push; branch protection on `main`, or an organization policy that caps workflow tokens at read-only, blocks it. GitHub disables a scheduled workflow after 60 days without repository activity, and the sync only commits when a vendored path changes, so a quiet upstream can switch it off. Re-enable it from the Actions tab.

By hand:

```bash
node scripts/sync-upstream.mjs        # or a branch, a tag, or a full 40-character commit SHA
node scripts/generate-omp-tree.mjs
```

The sync or the generator fails, and the scheduled run fails without pushing, when:

- a path in `VENDORED` is gone upstream. The sync names it. Drop it from `VENDORED`, or vendor what replaced it.
- upstream changes `docs/harness/claude-code.md`. Upstream adds a row there for each Cursor name its skills start using, and the matching `TERMS` entry lives in a script the sync does not fetch. Port the change to `adapter/omp.md` and `TERMS`, then update `CLAUDE_ADAPTER_SHA256` in the generator.
- a skill uses a Cursor name in `TERMS` that `adapter/omp.md` has no row or section for.
- `setup-pstack`, `poteto-mode`, `poteto-help`, `deslop`, `control-cli`, `control-ui`, `verify-this`, or `skill-creator` is gone. The adapter and the README point at them.
- two skills from `upstream/pstack/skills/`, `upstream/cursor-team-kit/skills/`, and `adapter/skills/` share a name. The tree has one `skills/<name>/` folder for each name.
- a skill in `upstream/` or `adapter/skills/` is named `pstack-omp-adapter`.
- a row of the adapter's "Rewritten paths" table matches nothing upstream. Delete the row.
- a skill's `name` differs from its folder, a relative link leaves the tree, a relative link in an `adapter/skills/` skill leaves its own folder or points at a file it lacks, a file name is one Windows cannot check out, or upstream's version is not `MAJOR.MINOR.PATCH`.

GitHub emails you about the failed run. Fix the cause, regenerate, and commit. CI runs `node scripts/generate-omp-tree.mjs --check` and fails while the tree is out of date or while a path in `upstream/` differs from its object id in `upstream/UPSTREAM.json`.
