---
name: reflect
description: Spawn three parallel review subagents over the active transcript, surface learnings, and route each to a concrete edit on an existing skill. Use when the user says reflect.
disable-model-invocation: true
---

# Reflect

In omp, map the Cursor names in this skill with these rows. `skill://pstack-omp-adapter` has the full map. If a Cursor field has no row in either, drop it and say so. Never pass a field or value the tool schema rejects. Write the omp name, never the Cursor one, in replies, briefs, and questions to the user.

A `task` item takes `model` only when `task.perCallModel` is on, and only for models the operator approved. The sign is the `task` description: it lists the approved per-call models only when per-call selection is on. A `model` field in the schema alone is not enough, because the bundled seance agent adds it too. Without that list, omit `model` everywhere below: the agent runs on its configured model. Say so once per session, and tell the user that `/skill:setup-pstack` turns per-role models on.

omp has no Cursor Automations, Bugbot, Cursor cloud agents, or built-in PR tool. When a step needs one, put one line in your reply, `Skipped in omp: <step>. <reason>.`, then go on to the next step. Do not stop, ask, or retry. When a later step needs what the skipped step made, such as a URL or a key, leave a placeholder and name it in the line.

| Cursor | omp |
| --- | --- |
| `Task` | `task`. With the batch schema, send `{ context, tasks: [{ agent, name, task, solutionSpace }] }`: `context` is shared background and each `task` is self-contained. When a skill names a subagent type, write `agent` as the first key of the item, before `task`. Written after a long `task`, it gets left out. |
| Run another pstack skill (`/name` or "the **name** skill") | `read skill://<name>` and follow it. When you tell the user to type it, write `/skill:<name>`. |
| Cursor's built-in `create-skill` skill, `/create-skill` | `read skill://skill-creator` and follow it. pstack for omp ships Anthropic's skill-creator, adapted for omp. Its draft, test, and iterate loop runs test cases as `task` subagents, and its description optimization (`scripts/run_loop.py`) runs on `omp -p`. |
| `subagent_type: generalPurpose` | Omit `agent`. The default `task` agent runs. |
| `readonly: true` | Omit `agent`, and the brief says "read-only: do not edit, write, or commit files". Check `git status` afterward. Do not use `scout` for a role that names a model: it is a cheap lookup agent. |
| A pstack file in a `Task` brief, such as a reference prompt or a playbook | Name it as `skill://<name>/<path>`, such as `skill://reflect/references/synthesizer.md`. Subagents resolve it as you do; a relative or `plugins/pstack/...` path sends them searching the disk. When the brief has them follow a pstack skill or reference prompt, also tell them to read `skill://pstack-omp-adapter` first. |
| `claude-<family>-<version>-<effort>[-fast]`, such as `claude-opus-5-5-xhigh` | `model: "<provider>/<model-id>:<effort>"`, such as `anthropic/claude-opus-5-5:xhigh`. Take `<provider>/<model-id>` exactly as `omp models` lists it. Drop `-fast`. |
| A `grok-*`, `gpt-*`, or other slug | The same shape, with the selector `omp models` lists for that family, such as `xai/grok-4.7:xhigh`. If none is listed, omit `model` and say so. |
| `auto` or `inherit-parent` | Omit `model`. |
| The `pstack-models.mdc` rule, `~/.cursor/rules/pstack-models.mdc` | `~/.omp/agent/rules/pstack-models.md`. It is an always-applied rule, so its role lines are already in your system prompt. If they are not, read the file. If the file or the role's line is missing, use the skill's default slug. omp also loads `~/.cursor/rules/*.mdc`, so map any Cursor slug you find there with the rows above. |
| The `Task` tool rejects the slug | Preflight fails with `Per-call model … is not approved` or `not available`. Handle it as the skill's rejected-slug case. If preflight says `task.perCallModel` does not allow the call, omit `model` for the rest of the session and say so once. |
| `~/.cursor/plugins/`, `.cursor-plugin/plugin.json` | pstack lives in the omp plugin cache, `~/.omp/plugins/cache/plugins/<marketplace>___pstack___<version>/`, with `.omp-plugin/plugin.json`. Do not search for it: `read skill://<name>` prints the real path. |
| Transcripts in `~/.cursor/projects/<slug>/agent-transcripts/` | omp has no `agent-transcripts/` folder, and its system prompt names no transcript. Run `echo "$PI_SESSION_FILE"` in `bash`: omp sets that variable to the absolute path of this conversation's transcript, on every platform. In a subagent it is the subagent's own transcript, and the main conversation's is the `.jsonl` named like the folder that holds it. Earlier sessions of this workspace are the other `.jsonl` files in the main transcript's folder; list that one folder with `glob`. That variable is the only way to find a transcript. Never list, glob, or `find` any other session folder: they hold other workspaces' private chats. Line 1 of a transcript is a `title` record and line 2 the `session` header with `id` and `cwd`. Conversation turns are `{"type":"message","message":{"role":…,"content":[…]}}` lines, where `role` is `user`, `assistant`, `toolResult`, or `developer` (harness notices) and `content` is a list of blocks such as `{"type":"text","text":…}`; skip every other `type`. The folder beside each `.jsonl` with the same name holds its artifacts, including subagent transcripts as `<id>.jsonl`. `history://<id>` renders a subagent transcript as text. |
| Cursor Automations: routines, `update_state` routine calls, `api2.cursor.sh/automations` webhooks, routine wakes, and `SendToUser` secret requests | Skip with the line. |
| Bugbot | Bugbot comments on a GitHub PR are ordinary review threads, so triage them with the forge command that the step gives. Skip a step that starts, waits for, or configures Bugbot when the PR has no Bugbot check or comment. |
| Cursor cloud agents | `environment: "cloud"` maps to an isolated checkout, as in Subagent fields. Skip a step that needs the cloud agent itself, such as its dashboard status or its own machine. |
| A built-in PR tool | Use the forge command that the step gives, such as `gh pr create`. `read pr://<n>` shows a GitHub PR and `pr://<n>/diff` its diff. That is not a skip, so write no line. |
| Cursor's `/loop` command, such as `/loop until X` or `/loop 1h` | omp has no `/loop` and no recurring timer. To wake on an event (CI, a merge, a ref moving), run the watcher as a background `bash` job or a `task` subagent. Its result wakes the session when it finishes. Start it through the tool, not with `nohup`, `disown`, or a trailing `&`: a detached process cannot wake you and outlives the session. Always give it a time limit, such as a capped number of checks, so it ends even when the event never comes. Never write `while true`. For a fixed tick such as `/loop 1h`, write the skip line once, then run the tick's audit at each phase boundary and each time a result wakes you. In a plan file, keep the literal `/loop 1h` line, because `check-plan.mjs` requires it. |
| Cursor Custom Modes, such as keeping `/poteto-mode` on with Option+Enter or the Agents Window | omp has no Custom Modes. Start each task with `/skill:poteto-mode`, or under `omp -p` with `read skill://poteto-mode and follow it`. |

Mine the current conversation for durable learnings, then route them into skill edits.

Invoke when the user says "reflect" or "/reflect". Skip when the conversation is trivial, off-topic, or already covered by an existing skill the parent followed correctly. One-offs are not learnings.

## 1. Locate the active transcript

Before fanning out, find this conversation's transcript in the `agent-transcripts/` directory the system prompt names. Do not glob across `~/.cursor/projects/*/`. That crosses workspace boundaries and reads private chats from unrelated projects.

```bash
ls -t <agent-transcripts>/*.jsonl <agent-transcripts>/*/*.jsonl <agent-transcripts>/*/subagents/*.jsonl 2>/dev/null | head -10
```

That covers the legacy flat (`<id>.jsonl`), current nested (`<id>/<id>.jsonl`), and subagent (`<parent>/subagents/<child>.jsonl`) layouts. For each candidate, read the first JSONL line. Take the file whose `message.content[0].text` contains the conversation's opening user prompt. If none matches, pass a tight digest of the session instead.

## 2. Spawn three reviewers in parallel

One message, three `Task` calls, `subagent_type: generalPurpose`, agent mode (`readonly: false`). Reviewers need MCP access to look up the tickets, chat threads, and observability traces the transcript references, and readonly strips MCPs.

Each reviewer and the synthesizer name a role line in the `pstack-models.mdc` rule and a default. Set `model` to that line's value, or to the default if the rule or the line is missing. Leave `model` unset when the value is `auto` or `inherit-parent`. If the Task tool rejects a slug, use the default and say so. If it rejects the default, use the closest valid slug of the same family from its error message. Pick each subagent's reasoning level and fast or standard speed for the job, per the Subagents section of the **poteto-mode** skill.

| Lens | Role line | Default `model` | Prompt template |
|---|---|---|---|
| Judgment | `reflect judgment, divergent, synthesizer` | `claude-opus-5-5-xhigh` | `references/judgment-reviewer.md` |
| Tooling | `reflect tooling` | `grok-4.7-xhigh-fast` | `references/tooling-reviewer.md` |
| Divergent | `reflect judgment, divergent, synthesizer` | `claude-opus-5-5-xhigh` | `references/divergent-reviewer.md` |

Pass each template verbatim, substituting the transcript path or digest where marked. Reviewers return findings in the `Task` response body.

## 3. Synthesize

One `Task` call, `subagent_type: generalPurpose`, `model` from the `reflect judgment, divergent, synthesizer` line (default `claude-opus-5-5-xhigh`), agent mode (`readonly: false`). It spot-verifies citations through MCP, and readonly strips MCPs. Pass `references/synthesizer.md` verbatim, with each reviewer's full output inlined where marked. It returns an Accepted / Rejected / Backlog list.

## 4. Structural enforcement check

Move any Accepted item that a lint rule, script, metadata flag, or runtime check would enforce more reliably to Backlog. See the **encode-lessons-in-structure** principle skill.

## 5. Apply

Present the synthesizer's full Accepted / Rejected / Backlog output and wait for explicit approval before applying any Accepted edit. The user picks the subset and may redirect routings. Skill changes affect every future agent in the org. Do not auto-apply.

File each Backlog item to your team's devex or backlog tracker without waiting. Only the Accepted list waits for approval.

Never edit a skill under `plugins/cache/`. Before approval, show its destination, `.omp/skills/<skill>/` or `~/.omp/agent/skills/<skill>/`. After approval, copy the skill folder there and edit the copy. Never open a PR or push.

Follow each approved row's Routing exactly:

- Trivial existing-skill edit (a one-line bullet, a tightened sentence, a stale fact corrected): the parent does it directly.
- Substantive existing-skill edit (a new section, a new pattern table, more than ~10 lines): hand to Cursor's built-in `create-skill` skill and run its draft / test / iterate loop.
- `tune description: <skill path>` (the skill exists but didn't trigger when it should have): hand to `create-skill` and run its description-optimization loop.
- `new skill via create-skill: <kebab-name>`: hand creation to `create-skill`. Do not invent the shape ad hoc.

If your environment ships a SKILL.md validator, run it on every touched skill before declaring done.

## 6. Summarize for the user

Short list, no preamble:

- Edits applied: `<skill path>`. What changed, one line each.
- New skills created: `<skill path>`. One line each (rare).
- Backlog filed to the devex tracker: `<issue title>` (`<tags>`). One line each.
- Dropped: one line per rejected finding + reason from the synthesizer.
