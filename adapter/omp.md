# pstack in omp

pstack skills use Cursor names. In omp, read this once per session, then map each Cursor name in a skill with the tables below. `<pstack>` means the folder that holds `skills/` and `docs/`. If a Cursor field has no row, drop it and say so. Never pass a field or value the tool schema rejects. Write the omp name, never the Cursor one, in replies, briefs, and questions to the user.

`read skill://<name>` opens any pstack skill, including the ones your skill catalog hides. Its first line, `[Skill file: <path>]`, is the real path. Resolve a relative link in a skill against that path's folder, so `<pstack>` is two folders above it.

## Tools

| Cursor | omp |
| --- | --- |
| `Task` | `task`. With the batch schema, send `{ context, tasks: [{ agent, name, task, solutionSpace }] }`: `context` is shared background and each `task` is self-contained. When a skill names a subagent type, write `agent` as the first key of the item, before `task`. Written after a long `task`, it gets left out. |
| `AskQuestion` | `ask`, one HTML form: radio inputs for one-of, checkboxes for many-of, the recommended option preselected. In `-p` mode and in subagents it is absent or fails, so ask in plain text, or put the question in your final answer. |
| Open a todolist | `todo` with `op: "init"`, one phase per playbook stage. Send it beside your next real tool call. Subagents have no `todo`, so they keep the list in their reply. |
| Run another pstack skill (`/name` or "the **name** skill") | `read skill://<name>` and follow it. When you tell the user to type it, write `/skill:<name>`. |
| The `deslop`, `control-cli`, `control-ui`, or `verify-this` skill from the `cursor-team-kit` plugin | pstack for omp ships all four, so there is nothing to install. `read skill://<name>` and follow it, as for a pstack skill. |
| Cursor's built-in `create-skill` skill, `/create-skill` | `read skill://skill-creator` and follow it. pstack for omp ships Anthropic's skill-creator, adapted for omp. Its draft, test, and iterate loop runs test cases as `task` subagents, and its description optimization (`scripts/run_loop.py`) runs on `omp -p`. |
| `Grep`, `Glob`, `Read` | `grep`, `glob`, `read`. |

## Subagent fields

| Cursor | omp |
| --- | --- |
| `subagent_type: generalPurpose` | Omit `agent`. The default `task` agent runs. |
| `poteto-agent`, `comment-sicko`, `subagent_type: "poteto-agent"` | Set `agent: "poteto-agent"` or `agent: "comment-sicko"` as the first key of each task item. The plugin ships both without a prefix. An item without `agent` runs the generic `task` agent, which never loads poteto-mode. |
| `readonly: true` | Omit `agent`, and the brief says "read-only: do not edit, write, or commit files". Check `git status` afterward. Do not use `scout` for a role that names a model: it is a cheap lookup agent. |
| `readonly: false` | Omit `agent`. The `task` agent keeps the session's MCP tools. |
| `environment: "cloud"` | `isolated: true` when the `task` schema offers `isolated` (needs `task.isolation.enabled`). Name the branch or commit the worker checks out. Without it, make a checkout with `git worktree add`, or `ovnfs new` when the system prompt offers it, and give the worker its path. |
| `environment: "local"` | Omit. |
| `cloud_base_branch: <b>` | Tell the worker to check out `<b>` first. |
| `run_in_background: true` | Omit. With async on, spawns already run in the background and their results arrive on their own. Call `wait` only when you are blocked with nothing else to do. |
| `resume` | `write agent://<id>` with the follow-up. omp revives an idle or parked agent with its context. To steer a running agent, write to it the same way. |
| `file_attachments` | List the paths in `task`. Put long shared material in a `local://<name>.md` file and name it, since subagents share your `local://` root. |
| A pstack file in a `Task` brief, such as a reference prompt or a playbook | Name it as `skill://<name>/<path>`, such as `skill://reflect/references/synthesizer.md`. Subagents resolve it as you do; a relative or `plugins/pstack/...` path sends them searching the disk. When the brief has them follow a pstack skill or reference prompt, also tell them to read `skill://pstack-omp-adapter` first. |

## Models

A `task` item takes `model` only when `task.perCallModel` is on, and only for models the operator approved. The sign is the `task` description: it lists the approved per-call models only when per-call selection is on. A `model` field in the schema alone is not enough, because the bundled seance agent adds it too. Without that list, omit `model` everywhere below: the agent runs on its configured model. Say so once per session, and tell the user that `/skill:setup-pstack` turns per-role models on.

| Cursor | omp |
| --- | --- |
| `claude-<family>-<version>-<effort>[-fast]`, such as `claude-opus-5-5-xhigh` | `model: "<provider>/<model-id>:<effort>"`, such as `anthropic/claude-opus-5-5:xhigh`. Take `<provider>/<model-id>` exactly as `omp models` lists it. Drop `-fast`. |
| A `grok-*`, `gpt-*`, or other slug | The same shape, with the selector `omp models` lists for that family, such as `xai/grok-4.7:xhigh`. If none is listed, omit `model` and say so. |
| `auto` or `inherit-parent` | Omit `model`. |
| The `pstack-models.mdc` rule, `~/.cursor/rules/pstack-models.mdc` | `~/.omp/agent/rules/pstack-models.md`. It is an always-applied rule, so its role lines are already in your system prompt. If they are not, read the file. If the file or the role's line is missing, use the skill's default slug. omp also loads `~/.cursor/rules/*.mdc`, so map any Cursor slug you find there with the rows above. |
| A role value `<provider>/<model-id>:<effort>` | Pass it as `model` unchanged. The `:<effort>` suffix is the effort token. |
| The `Task` tool rejects the slug | Preflight fails with `Per-call model … is not approved` or `not available`. Handle it as the skill's rejected-slug case. If preflight says `task.perCallModel` does not allow the call, omit `model` for the rest of the session and say so once. |

## setup-pstack

omp injects every `alwaysApply: true` rule in `~/.omp/agent/rules/` into each new session, so `setup-pstack` writes its rule there. Follow its steps with these changes:

- Detect. Run `omp models --json` in `bash`. The detected models are its chat models, each written `<provider>/<model-id>:<effort>` with an effort the model supports, such as `anthropic/claude-opus-5-5:xhigh`. The `:<effort>` suffix is the effort token, so the budget step works as written.
- Defaults. Map each default slug with the Models rows: `claude-opus-5-5-xhigh` is `anthropic/claude-opus-5-5:xhigh` when that model is detected. A default whose family is not detected is `inherit-parent`.
- Write. Write `~/.omp/agent/rules/pstack-models.md` with the frontmatter `description: pstack per-role model choices (overrides skill defaults)` and `alwaysApply: true`, then the comment lines, the `# budget` line, and one line per role from step 5. Overwrite the whole file. Never put the role lines in `AGENTS.md`.
- Approve. omp runs a per-call `model` only when three things hold. `task.perCallModel` is `on`. A chat role in `modelRoles` names the same `<provider>/<model-id>`, at any effort. If `task.perCallModelAllow` is not empty, it lists that `<provider>/<model-id>`. Project settings never approve a model. `read` `cfg://task` and `cfg://modelRoles`. They show this session's values, and those decide approval. A value whose `source` is `session override` holds for this session only, as when `--model` replaces the `default` role. A save writes the value you send to the global config and to this session. So build each value you save from the global one in `~/.omp/agent/config.yml`, never from a session override. Then change only what differs, each change a `write` to a `cfg://` path:
  - If `task.perCallModel` is not `on`, write `on` to `cfg://task/perCallModel/save`.
  - setup-pstack owns every `modelRoles` role whose name starts with `pstack-`, and no other role. A model approved only through one of the user's own roles stops being approved when the user changes that role, so pstack keeps its own approvals. The pstack set is one role for each base model the rule names, even when another role already names that model. Name it `pstack-<model-id>`, the model id without the provider, and give it the value `<provider>/<model-id>` with no effort, such as `pstack-grok-4.7: xai/grok-4.7` or `pstack-claude-sonnet-5-5: anthropic/claude-sonnet-5-5`. If two providers serve the same model id, append the provider, as in `pstack-grok-4.7-openrouter`. When the saved `pstack-*` roles differ from the pstack set, write the whole record to `cfg://modelRoles/save`: every saved role whose name does not start with `pstack-`, unchanged, plus the pstack set. Saving replaces the record, so a `pstack-*` role whose model the rule no longer names drops out. Never add, edit, or remove a role whose name does not start with `pstack-`.
  - If the allowlist is not empty and leaves the model out, ask the user first, because the allowlist is a limit they chose. If they agree, write the whole list with the model added to `cfg://task/perCallModelAllow/save`.
  - If a rule effort is above `task.maxEffort`, tell the user that the role runs at that cap.
  omp asks the user to approve each write, so do not ask before a write, except about the allowlist. Never add an allowlist the user has not set. Never edit `config.yml` or run `omp config set`.
- Check. For each model that gained a `pstack-*` role, spawn one `task` with that `model` and the task "reply ok". A `not approved` error names the setting that is still missing.
- Under `omp -p`, or anywhere else without an interactive session, `cfg://` writes fail. Print the settings for the user to set, and stop.

## Rewritten paths

pstack for omp already has these swapped in every skill and agent, so the text you follow names the omp folder. If you meet the Cursor form anywhere else, such as in upstream docs, use the omp form.

| Cursor | omp |
| --- | --- |
| `~/.cursor/skills/` | `~/.omp/agent/skills/` |
| `.cursor/skills/` | `.omp/skills/` |

## Paths

| Cursor | omp |
| --- | --- |
| `~/.cursor/plugins/`, `.cursor-plugin/plugin.json` | pstack lives in the omp plugin cache, `~/.omp/plugins/cache/plugins/<marketplace>___pstack___<version>/`, with `.omp-plugin/plugin.json`. Do not search for it: `read skill://<name>` prints the real path. |
| `.cursor/rules/*.mdc`, always-applied rules | `AGENTS.md`, or a `.omp/rules/<name>.md` rule with `alwaysApply: true`. User-wide rules go in `~/.omp/agent/rules/`. The model rule is the exception. See Models. |
| `https://github.com/cursor/plugins/blob/main/pstack/<path>` | `<pstack>/<path>` when that file exists. The plugin ships the skills, `docs/guide/`, and `README.md`. Read the local copy and never fetch it. Give the user the URL when they need a link. |
| Transcripts in `~/.cursor/projects/<slug>/agent-transcripts/` | omp has no `agent-transcripts/` folder, and its system prompt names no transcript. Run `echo "$PI_SESSION_FILE"` in `bash`: omp sets that variable to the absolute path of this conversation's transcript, on every platform. In a subagent it is the subagent's own transcript, and the main conversation's is the `.jsonl` named like the folder that holds it. Earlier sessions of this workspace are the other `.jsonl` files in the main transcript's folder; list that one folder with `glob`. That variable is the only way to find a transcript. Never list, glob, or `find` any other session folder: they hold other workspaces' private chats. Line 1 of a transcript is a `title` record and line 2 the `session` header with `id` and `cwd`. Conversation turns are `{"type":"message","message":{"role":…,"content":[…]}}` lines, where `role` is `user`, `assistant`, `toolResult`, or `developer` (harness notices) and `content` is a list of blocks such as `{"type":"text","text":…}`; skip every other `type`. The folder beside each `.jsonl` with the same name holds its artifacts, including subagent transcripts as `<id>.jsonl`. `history://<id>` renders a subagent transcript as text. |

## Cursor-only features

omp has no Cursor Automations, Bugbot, Cursor cloud agents, or built-in PR tool. When a step needs one, put one line in your reply, `Skipped in omp: <step>. <reason>.`, then go on to the next step. Do not stop, ask, or retry. When a later step needs what the skipped step made, such as a URL or a key, leave a placeholder and name it in the line.

| Cursor | omp |
| --- | --- |
| Cursor Automations: routines, `update_state` routine calls, `api2.cursor.sh/automations` webhooks, routine wakes, and `SendToUser` secret requests | Skip with the line. |
| Bugbot | Bugbot comments on a GitHub PR are ordinary review threads, so triage them with the forge command that the step gives. Skip a step that starts, waits for, or configures Bugbot when the PR has no Bugbot check or comment. |
| Cursor cloud agents | `environment: "cloud"` maps to an isolated checkout, as in Subagent fields. Skip a step that needs the cloud agent itself, such as its dashboard status or its own machine. |
| A built-in PR tool | Use the forge command that the step gives, such as `gh pr create`. `read pr://<n>` shows a GitHub PR and `pr://<n>/diff` its diff. That is not a skip, so write no line. |
| Cursor's `/loop` command, such as `/loop until X` or `/loop 1h` | omp has no `/loop` and no recurring timer. To wake on an event (CI, a merge, a ref moving), run the watcher as a background `bash` job or a `task` subagent. Its result wakes the session when it finishes. Start it through the tool, not with `nohup`, `disown`, or a trailing `&`: a detached process cannot wake you and outlives the session. Always give it a time limit, such as a capped number of checks, so it ends even when the event never comes. Never write `while true`. For a fixed tick such as `/loop 1h`, write the skip line once, then run the tick's audit at each phase boundary and each time a result wakes you. In a plan file, keep the literal `/loop 1h` line, because `check-plan.mjs` requires it. |
| Cursor Custom Modes, such as keeping `/poteto-mode` on with Option+Enter or the Agents Window | omp has no Custom Modes. Start each task with `/skill:poteto-mode`, or under `omp -p` with `read skill://poteto-mode and follow it`. |
