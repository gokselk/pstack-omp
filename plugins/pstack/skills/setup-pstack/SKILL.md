---
name: setup-pstack
description: Configure which models pstack uses per role and at what reasoning budget. Detects your available models and writes an always-applied rule that overrides the skill defaults. Use for /setup-pstack, "configure pstack models", "pstack budget", or changing pstack's model choices.
---

# Setup pstack

In omp, map the Cursor names in this skill with these rows. `skill://pstack-omp-adapter` has the full map. If a Cursor field has no row in either, drop it and say so. Never pass a field or value the tool schema rejects. Write the omp name, never the Cursor one, in replies, briefs, and questions to the user.

When the `task` description lists approved per-call models, set `model` on every item whose role line names a model. Use the role's value unchanged. The list appears only when `task.perCallModel` is on. A `model` field in the schema alone is not enough, because the bundled seance agent adds it too. Without the list, leave `model` off, say so once per session, and tell the user that `/skill:setup-pstack` turns per-role models on.

| Cursor | omp |
| --- | --- |
| `Task` | `task`. With the batch schema, send `{ context, tasks: [{ agent, model, name, task, solutionSpace }] }`: `context` is shared background and each `task` is self-contained. |
| `AskQuestion` | `ask`, one HTML form: radio inputs for one-of, checkboxes for many-of, the recommended option preselected. In `-p` mode and in subagents it is absent or fails, so ask in plain text, or put the question in your final answer. |
| Run another pstack skill (`/name` or "the **name** skill") | `read skill://<name>` and follow it. When you tell the user to type it, write `/skill:<name>`. |
| `subagent_type: generalPurpose` | Omit `agent`. The default `task` agent runs. |
| A pstack file in a `Task` brief, such as a reference prompt or a playbook | Name it as `skill://<name>/<path>`, such as `skill://poteto-mode/playbooks/feature.md`. Subagents resolve it as you do; a relative or `plugins/pstack/...` path sends them searching the disk. When the brief has them follow a pstack skill or reference prompt, also tell them to read `skill://pstack-omp-adapter` first. |
| `claude-<family>-<version>-<effort>[-fast]`, such as `claude-opus-5-5-xhigh-fast` | `model: "<provider>/<model-id>:<effort>"`, such as `anthropic/claude-opus-5-5:xhigh`. Take `<provider>/<model-id>` exactly as `omp models` lists it. Drop `-fast`. |
| A `gemini-*` or other slug | The same shape, with the selector `omp models` lists for that model, such as `google/gemini-4-neon:xhigh`. If none is listed, omit `model` and say so. |
| `auto` or `inherit-parent` | Omit `model`. pstack for omp ships `poteto-agent` without a model of its own, so it runs on the session model too. |
| The `pstack-models.mdc` rule, `~/.cursor/rules/pstack-models.mdc` | `~/.omp/agent/rules/pstack-models.md`. It is an always-applied rule, so its role lines are already in your system prompt. If they are not, read the file. Its role values are `<provider>/<model-id>:<effort>` selectors. If the file or the role's line is missing, use the skill's default slug. omp also loads `~/.cursor/rules/*.mdc`, so map any Cursor slug you find there with the rows above. |
| The `Task` tool rejects the slug | Preflight fails with `Per-call model … is not approved` or `not available`. Handle it as the skill's rejected-slug case. If preflight says `task.perCallModel` does not allow the call, omit `model` for the rest of the session and say so once. |
| `.cursor/rules/*.mdc`, always-applied rules | `AGENTS.md`, or a `.omp/rules/<name>.md` rule with `alwaysApply: true`. User-wide rules go in `~/.omp/agent/rules/`. The model rule is the exception. See Models. |

omp injects every `alwaysApply: true` rule in `~/.omp/agent/rules/` into each new session, so `setup-pstack` writes its rule there. Follow its steps with these changes:

- Detect. Run `omp models --json` in `bash`. The detected models are its chat models, each written `<provider>/<model-id>:<effort>` with an effort the model supports, such as `anthropic/claude-opus-5-5:xhigh`. The `:<effort>` suffix is the effort token, so the budget step works as written.
- Load. Match the slug patterns in step 2, such as `grok-*`, `claude-opus-*`, and `gemini-4-*`, against the `<model-id>` of a value, so `xai/grok-4.7:xhigh` is an old slug. A whole slug there, such as `gemini-4-neon-high`, is the selector the Models rows map it to, `google/gemini-4-neon:high`.
- Defaults. Map each default slug with the Models rows when its model is detected: `claude-opus-5-5-xhigh-fast` is `anthropic/claude-opus-5-5:xhigh`, `claude-opus-5-5-high-fast` is `anthropic/claude-opus-5-5:high`, `claude-fable-5-2-high` is `anthropic/claude-fable-5-2:high`, and `gemini-4-neon-xhigh` is `google/gemini-4-neon:xhigh`. A default whose model is not detected is `inherit-parent`.
- Write. Write `~/.omp/agent/rules/pstack-models.md` with the frontmatter `description: pstack per-role model choices (overrides skill defaults)` and `alwaysApply: true`, then the comment lines, the `# defaults: 3` line, the `# budget` line, and one line per role from step 5. Write the `inherit-parent` comment line without its parenthesized aside. Overwrite the whole file. Never put the role lines in `AGENTS.md`.
- Approve. omp runs a per-call `model` only when three things hold. `task.perCallModel` is `on`. A chat role in `modelRoles` names the same `<provider>/<model-id>`, at any effort. If `task.perCallModelAllow` is not empty, it lists that `<provider>/<model-id>`. Project settings never approve a model. `read` `cfg://task` and `cfg://modelRoles`. They show this session's values, and those decide approval. A value whose `source` is `session override` holds for this session only, as when `--model` replaces the `default` role. A save writes the value you send to the global config and to this session. So build each value you save from the global one in `~/.omp/agent/config.yml`, never from a session override. Then change only what differs, each change a `write` to a `cfg://` path:
  - If `task.perCallModel` is not `on`, write `on` to `cfg://task/perCallModel/save`.
  - setup-pstack owns every `modelRoles` role whose name starts with `pstack-`, and no other role. A model approved only through one of the user's own roles stops being approved when the user changes that role, so pstack keeps its own approvals. The pstack set is one role for each base model the rule names, even when another role already names that model. Name it `pstack-<provider>-<model-id>` and give it the value `<provider>/<model-id>` with no effort, such as `pstack-anthropic-claude-opus-5-5: anthropic/claude-opus-5-5` or `pstack-google-gemini-4-neon: google/gemini-4-neon`. When the saved `pstack-*` roles differ from the pstack set, write the whole record to `cfg://modelRoles/save`: every saved role whose name does not start with `pstack-`, unchanged, plus the pstack set. Saving replaces the record, so a `pstack-*` role whose model the rule no longer names drops out, as does one named in an older form. Never add, edit, or remove a role whose name does not start with `pstack-`.
  - If the allowlist is not empty and leaves the model out, ask the user first, because the allowlist is a limit they chose. If they agree, write the whole list with the model added to `cfg://task/perCallModelAllow/save`.
  - If a rule effort is above `task.maxEffort`, tell the user that the role runs at that cap.
  omp asks the user to approve each write, so do not ask before a write, except about the allowlist. Never add an allowlist the user has not set. Never edit `config.yml` or run `omp config set`.
- Check. For each model that gained a `pstack-*` role, spawn one `task` with that `model` and the task "reply ok". A `not approved` error names the setting that is still missing.
- Under `omp -p`, or anywhere else without an interactive session, `cfg://` writes fail. Print the settings for the user to set, and stop.

Write `~/.cursor/rules/pstack-models.mdc`, an always-applied rule that sets pstack's model per role.

## Steps

### 1. Detect available models

Enumerate the model slugs you can pass to a `Task` subagent in this session. That is the dependable source. If Cursor also exposes a models API or CLI that lists the user's entitled models, prefer it for completeness. If you cannot detect any, ask the user to paste the slugs they have access to. Never write a real slug you have not confirmed is available. The aliases `inherit-parent` and `auto` are always valid even though they are not detected slugs.

### 2. Load current state

The default role-to-model mapping is the rule shape shown in step 5 below. If `~/.cursor/rules/pstack-models.mdc` already exists, read it and treat its `# budget` line and its role values as the current choices. Otherwise start from those defaults. A line whose role is not in step 5, such as `hardest tasks`, `architect runners`, `reflect tooling`, or `why investigators`, is from a retired role. Drop it.

Older defaults put another Gemini model, then `gemini-4-neon-high`, in the panel seat. So in any rule, a `gemini-4-neon-high` entry, or a `gemini-4-*` entry other than `gemini-4-neon-*`, in a panel role (`arena runners`, `arena cross-judge pool`, `interrogate reviewers`) is an old default. Each one becomes `gemini-4-neon-xhigh`. A Gemini 4 Neon entry at any other level is the user's choice and stays. Tell the user which entries you replaced.

A rule without the `# defaults: 3` line comes from an older setup. That setup wrote a line for every role, so some of its values are old defaults, not choices. Before step 3, replace these values:

- An `arena cross-judge pool` list of exactly one `claude-fable-*` entry, one `claude-opus-*` entry, and one `gemini-*` entry, in any order, takes the role's step 5 list. Fable and Opus are one vendor, so the Fable entry could judge only where the Opus entry also could.
- A `# budget: unlimited` line becomes `large`, because no role runs above `xhigh`.
- If the rule has no `# defaults: 2` line either, an old slug is one that matches `grok-*`. An old slug in `feature, refactoring`, `bug-fix`, `perf-issue`, `hillclimb`, or `swarm workers` takes the role's step 5 default. In a panel role (`arena runners`, `arena cross-judge pool`, `interrogate reviewers`), a list of exactly one `claude-opus-*` entry and one old slug, in either order, takes the role's step 5 list. In any other list, each old slug becomes `claude-opus-5-5-high-fast`.

Every other value is the user's choice and stays, including an old slug in any other role and every `inherit-parent` or `auto` value. Tell the user which values you replaced.

### 3. Budget, map, and confirm

**(a) Ask for a budget.** Prefer AskQuestion over free text. Offer these three options with these exact labels, and name the current budget when the rule records one. With no rule, say that `large` matches the skill defaults.

- `large — xhigh reasoning`
- `medium — high reasoning`
- `small — medium reasoning`

**(b) Apply it.** Build the working table from the skill defaults, and on a re-run keep any role you changed by family, list, or alias (`inherit-parent`, `auto`). Families are the ones Phase A of the **arena** skill defines, so Fable is its own family. Each role has a target effort, which is its default's effort moved by the budget. `large` keeps it, `medium` lowers it one step, and `small` lowers it two steps, on the ladder `xhigh` > `high` > `medium` > `low`. No role runs above `xhigh`, and a target at the bottom of the ladder stays there. Most defaults are at `xhigh`, and each budget label names where those land. Set the effort token of every real slug in the role, panel entries included, to the role's target. The effort token is the last token, or the one before a trailing `fast`. If the result is not a detected slug, use the same family's detected slug with the highest effort at or below the target, else mark the role as needing a choice. `inherit-parent` and `auto` do not change. So `medium` turns `claude-opus-5-5-xhigh-fast` into `claude-opus-5-5-high-fast` and `claude-opus-5-5-high-fast` into `claude-opus-5-5-medium-fast`, and `small` turns them into `claude-opus-5-5-medium-fast` and `claude-opus-5-5-low-fast`. Opus 5.5 always runs its `-fast` slug, so every Opus 5.5 value ends in `-fast`. Fable 5.2 and Gemini have no fast slug, so never write one. Gemini 4 Neon slugs run from `low` to `xhigh` with no `max` or `fast` slug, so its seat runs at `gemini-4-neon-xhigh`, its top slug. A Gemini 4 Neon entry in a panel role takes its own target, `xhigh` moved by the budget, so `large` keeps `gemini-4-neon-xhigh`, `medium` writes `gemini-4-neon-high`, and `small` writes `gemini-4-neon-medium`.

**(c) Show the roles and confirm.** Show every role with its model, marking any real slug not in the detected set as needing a choice. Also list each line step 2 dropped. Ask whether to accept as-is or change specific roles, offering the detected models at `xhigh` or below plus `inherit-parent` and `auto` (both mean: this role runs on the parent chat model, which is how Auto users stay on Auto) as the options. Prefer AskQuestion over free text. For panel roles (arena runners, interrogate reviewers) the value is a list, and one subagent runs per entry, alias entries included, so the list length sets the count. `arena cross-judge pool` is also a list, but Arena runs one judge. It tries only values from a vendor other than the parent's, in list order, so order it by preference. Fable and the other Claude models are one vendor. An `inherit-parent` or `auto` value never judges. `swarm workers` is the default model for every worker unless a race or comparison assigns another model per arm.

### 4. Validate

Every real slug written must be in the detected set and at `xhigh` or below. `inherit-parent` and `auto` always pass. If a chosen real slug is not available, stop and ask again.

### 5. Write the rule

Write `~/.cursor/rules/pstack-models.mdc` with `alwaysApply: true`, the `# defaults: 3` line, a `# budget` line with the chosen label and the effort that label names, and one line per role, using the same labels poteto-mode uses. Overwrite the whole file so re-runs stay idempotent. Shape:

```
---
description: pstack per-role model choices (overrides skill defaults)
alwaysApply: true
---
# pstack model configuration. One line per role. Delete a line to fall back to the skill default.
# `inherit-parent` or `auto` as a value: the role runs on the parent chat model (omit Task `model` and spawn `generalPurpose`). Alias entries in a panel list still count toward its fan-out.
# defaults: 3
# budget: large (xhigh)
feature, refactoring: claude-opus-5-5-xhigh-fast
bug-fix: claude-opus-5-5-xhigh-fast
perf-issue: claude-opus-5-5-xhigh-fast
hillclimb: claude-opus-5-5-xhigh-fast
judgment and prose: claude-opus-5-5-xhigh-fast
arena runners: claude-fable-5-2-high, claude-opus-5-5-high-fast, gemini-4-neon-xhigh
arena cross-judge pool: claude-opus-5-5-high-fast, gemini-4-neon-xhigh
swarm workers: claude-opus-5-5-high-fast
interrogate reviewers: claude-fable-5-2-high, claude-opus-5-5-high-fast, gemini-4-neon-xhigh
```

### 6. Confirm

Tell the user the rule was written and that it applies to new sessions. Re-running this skill updates it.

### 7. Offer a verification skill (optional)

Check whether the project has a way to drive the real app for proof (a `verify-*` skill, or an existing harness). If not, offer once: "want a project-local verification skill, so agents can drive the app the way a user does and prove changes work? I can generate one with /create-verification-skill." On yes, invoke `/create-verification-skill` (resolves wherever pstack is installed: workspace, user, or plugin). On no, move on without pushing.

### 8. Offer a formal verification skill (optional)

Check whether the project already has a formal verification skill (a project skill that runs a model checker, a proof, or another verifier against the code). If not, offer once: "want a formal verification skill, so agents can prove a key property of your code holds in every case in scope, not only the cases tests reach? I can generate one with /create-formal-verification-skill." On yes, invoke `/create-formal-verification-skill` (resolves wherever pstack is installed: workspace, user, or plugin). On no, move on without pushing.
