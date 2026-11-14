---
name: arena
description: "Spawn N parallel candidates at the same task, pick a base, graft the strongest parts of the losers into it. Use for /arena, 'arena this', 'throw it in the arena', or when one attempt at a non-trivial artifact would lock in the wrong shape."
disable-model-invocation: true
---

# Arena

In omp, map the Cursor names in this skill with these rows. `skill://pstack-omp-adapter` has the full map. If a Cursor field has no row in either, drop it and say so. Never pass a field or value the tool schema rejects. Write the omp name, never the Cursor one, in replies, briefs, and questions to the user.

When the `task` description lists approved per-call models, set `model` on every item whose role line names a model. Use the role's value unchanged. The list appears only when `task.perCallModel` is on. A `model` field in the schema alone is not enough, because the bundled seance agent adds it too. Without the list, leave `model` off, say so once per session, and tell the user that `/skill:setup-pstack` turns per-role models on.

| Cursor | omp |
| --- | --- |
| `Task` | `task`. With the batch schema, send `{ context, tasks: [{ agent, model, name, task, solutionSpace }] }`: `context` is shared background and each `task` is self-contained. Write `agent` and `model` as the first keys of each item, before `task`, whenever the skill names a subagent type or a model. Written after a long `task`, they get left out. |
| Open a todolist | `todo` with `op: "init"`, one phase per playbook stage. Send it beside your next real tool call. Subagents have no `todo`, so they keep the list in their reply. |
| Run another pstack skill (`/name` or "the **name** skill") | `read skill://<name>` and follow it. When you tell the user to type it, write `/skill:<name>`. |
| `run_in_background: true` | Omit. With async on, spawns already run in the background and their results arrive on their own. Call `wait` only when you are blocked with nothing else to do. |
| A pstack file in a `Task` brief, such as a reference prompt or a playbook | Name it as `skill://<name>/<path>`, such as `skill://reflect/references/synthesizer.md`. Subagents resolve it as you do; a relative or `plugins/pstack/...` path sends them searching the disk. When the brief has them follow a pstack skill or reference prompt, also tell them to read `skill://pstack-omp-adapter` first. |
| `claude-<family>-<version>-<effort>[-fast]`, such as `claude-opus-5-5-xhigh` | `model: "<provider>/<model-id>:<effort>"`, such as `anthropic/claude-opus-5-5:xhigh`. Take `<provider>/<model-id>` exactly as `omp models` lists it. Drop `-fast`. |
| A `grok-*`, `gpt-*`, or other slug | The same shape, with the selector `omp models` lists for that family, such as `xai/grok-4.7:xhigh`. If none is listed, omit `model` and say so. |
| `auto` or `inherit-parent` | Omit `model`. |
| The `pstack-models.mdc` rule, `~/.cursor/rules/pstack-models.mdc` | `~/.omp/agent/rules/pstack-models.md`. It is an always-applied rule, so its role lines are already in your system prompt. If they are not, read the file. Pass a role's value `<provider>/<model-id>:<effort>` as `model` on each item, unchanged. If the file or the role's line is missing, use the skill's default slug. omp also loads `~/.cursor/rules/*.mdc`, so map any Cursor slug you find there with the rows above. |
| The `Task` tool rejects the slug | Preflight fails with `Per-call model … is not approved` or `not available`. Handle it as the skill's rejected-slug case. If preflight says `task.perCallModel` does not allow the call, omit `model` for the rest of the session and say so once. |
| `.cursor/rules/*.mdc`, always-applied rules | `AGENTS.md`, or a `.omp/rules/<name>.md` rule with `alwaysApply: true`. User-wide rules go in `~/.omp/agent/rules/`. The model rule is the exception. See Models. |

Open a todolist with one entry per phase (Frame, Fan out, Cross-judge, Pick, Graft, Verify) before launching anything.

## Phase A: Frame

Every candidate gets the same prompt, so the prompt is the contract.

1. State the artifact each candidate is producing.
2. Derive the rubric, 3-6 concrete gradeable criteria for what success looks like on *this* task. It is the picker's tool in Phase D. Candidates only see the task.
3. Pick the runners. Use the `arena runners` line in `~/.cursor/rules/pstack-models.mdc`. If the rule or that line is missing, default to one each on `claude-opus-5-5-xhigh` and `grok-4.7-xhigh-fast`. An `auto` or `inherit-parent` entry in this line means the parent model, so omit `model` for it. If the Task tool rejects a configured entry, run that seat on its family's default and say so. Families go by prefix: `claude-*`, and `grok-*` with `cursor-grok-*` and `composer-*`. A refused `composer-*` entry runs on `grok-4.7-xhigh-fast`. If the family has no default, or the Task tool rejects that default, use the closest valid slug of the same family from its error message, or drop the seat and say so when there is none. If dropped seats leave fewer than two runners, add runners until there are two, or one when the line has one entry. Run each added runner on a remaining runner's model, or omit `model` so it runs on the parent model when none remain, and say so. Spawn more runners when the arena covers multiple design directions. Use the same model N times when the work is generation-bound rather than judgment-sensitive. Pick each subagent's reasoning level and fast or standard speed for the job, per the Subagents section of the **poteto-mode** skill.
4. Give each candidate its own output location (a git worktree where possible, otherwise `/tmp/arena-<slug>/candidate-<n>/`), per the **separate-before-serializing-shared-state** principle skill.

## Phase B: Fan out

Spawn all N subagents in one message with `run_in_background: true`, each with the task, the path to the shared grounding, its own output path, and instructions to produce the artifact and a short rationale naming the alternatives it considered and what it rejected.

If a candidate produces no output, proceed with N-1 and note the dropout.

## Phase C: Cross-judge

After all Phase B candidates complete, choose one model from the `arena cross-judge pool` line in `~/.cursor/rules/pstack-models.mdc`. If the rule or that line is missing, choose from `claude-opus-5-5-xhigh` and `grok-4.7-xhigh-fast`. Spawn one readonly judge subagent. The judge is never from the parent's family, as Phase A step 3 defines families. Try only the entries from another family, in pool order. An `auto` or `inherit-parent` entry is the parent model, so it never judges. With the default pool, a Claude parent gets `grok-4.7-xhigh-fast`. A parent from any other family gets `claude-opus-5-5-xhigh` first. If the Task tool rejects an entry, use a valid slug of the same model at the closest level or speed from the error message, or move to the next entry when there is none. If no entry from another family runs, try the default pool's entries from another family the same way. If none of those runs, skip the judge, pick the base alone in Phase D, and say so. If you do not know the parent's model, try the pool's real slugs in pool order and say that the family check did not run. The judge sees the rubric and the candidates by path label, scores each criterion, and recommends a base with rationale. It runs in parallel with your reading in Phase D. Don't spawn it while candidates are still writing.

## Phase D: Pick a base

Read every candidate end to end before picking. Score each against the rubric criterion by criterion, not on holistic feel, and compare with the cross-judge when Phase C ran one. Agreement on the base confirms the pick. Disagreement means one of you is biased or the rubric was ambiguous. Read both rationales before deciding.

Pick the base a future maintainer can extend most easily without breaking invariants. When two feel tied, prefer the cleaner boundary or smaller API, per the Laziness Protocol.

## Phase E: Graft

Walk each losing candidate once more for what is worth porting into the base, usually one or two things per candidate, not most of it. Fold each graft in by hand, per the **redesign-from-first-principles** principle skill, so the result stays coherent under one mental model. Don't paste mechanically.

If the candidates converge on one shape, that is strong agreement. Note it and ship the consensus shape. No graft is needed. If they wildly diverge, Phase A was under-specified. Reframe and re-run rather than averaging the divergence.

## Phase F: Verify

Verify the synthesized artifact like any other output, per the **prove-it-works** principle skill. If verification finds a problem the arena missed, either Phase A was wrong (re-frame and re-run) or a candidate caught it and you missed the graft (go back to Phase E). Don't paper over it.

## Outputs

One synthesized artifact, with a short synthesis note alongside naming the base and why, the cross-judge's verdict or that Phase C skipped the judge, each graft with its source candidate, what was rejected and why, any convergence or dropouts, and the verification result.
