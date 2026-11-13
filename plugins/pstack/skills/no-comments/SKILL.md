---
name: no-comments
description: "Spawn Comment Sicko, fix accepted findings, and offer encodings for claimed constraints."
disable-model-invocation: true
---

# No comments

In omp, map the Cursor names in this skill with these rows. `skill://pstack-omp-adapter` has the full map. If a Cursor field has no row in either, drop it and say so. Never pass a field or value the tool schema rejects. Write the omp name, never the Cursor one, in replies, briefs, and questions to the user.

A `task` item takes `model` only when `task.perCallModel` is on, and only for models the operator approved. The sign is the `task` description: it lists the approved per-call models only when per-call selection is on. A `model` field in the schema alone is not enough, because the bundled seance agent adds it too. Without that list, omit `model` everywhere below: the agent runs on its configured model. Say so once per session, and tell the user that `/skill:setup-pstack` turns per-role models on.

| Cursor | omp |
| --- | --- |
| `Task` | `task`. With the batch schema, send `{ context, tasks: [{ agent, model, name, task, solutionSpace }] }`: `context` is shared background and each `task` is self-contained. Write `agent` and `model` as the first keys of each item, before `task`, whenever the skill names a subagent type or a model. Written after a long `task`, they get left out. |
| Run another pstack skill (`/name` or "the **name** skill") | `read skill://<name>` and follow it. When you tell the user to type it, write `/skill:<name>`. |
| `poteto-agent`, `comment-sicko`, `subagent_type: "poteto-agent"` | Set `agent: "poteto-agent"` or `agent: "comment-sicko"` as the first key of each task item. The plugin ships both without a prefix. An item without `agent` runs the generic `task` agent, which never loads poteto-mode. |
| A pstack file in a `Task` brief, such as a reference prompt or a playbook | Name it as `skill://<name>/<path>`, such as `skill://reflect/references/synthesizer.md`. Subagents resolve it as you do; a relative or `plugins/pstack/...` path sends them searching the disk. When the brief has them follow a pstack skill or reference prompt, also tell them to read `skill://pstack-omp-adapter` first. |
| The `Task` tool rejects the slug | Preflight fails with `Per-call model … is not approved` or `not available`. Handle it as the skill's rejected-slug case. If preflight says `task.perCallModel` does not allow the call, omit `model` for the rest of the session and say so once. |

Spawn Comment Sicko. Act on accepted findings.

Defer to Comment Sicko's fresh perspective.

## Scope

Use the caller's files or diff. Otherwise use the current diff against the base branch, default `main`, including the working tree.

## Steps

1. Spawn `Task` with `subagent_type: "comment-sicko"`. Pass the scope. Pick each subagent's reasoning level and fast or standard speed for the job, per the Subagents section of the **poteto-mode** skill. Do not restate its rules.
2. Inspect its report and diff. Reject application-code edits, scope escapes, exception-protected deletions, misstated `MUST KILL` reasons, and flags that treat kept intentional code as guilty. Reshape flags on our-code surprises stay actionable. Do not restore those comments. A keep survives only with proof it is about something we cannot change. Audit missed scoped lint and TypeScript suppressions. Correctness or safety suppressions stay actionable `MUST KILL`s. Restore deletions only with exact exceptions and scoped proof. Before accepting thin `IMPORTANT` or `do not remove` kills or keeps, run `/how` or `/why` on their symbol. If a kill is ambiguous, do not restore. If a keep is refuted or still ambiguous, delete it. Revert and rerun one rejected report with the failure named. Reject a second, report it open, and fail `/no-comments`.
3. Fix trivial accepted flags directly by deleting a dead path, dropping a parameter, or using the real API. If any fix needs a shape, run `/architect` once for the accepted set and surrounding code. Stop at the sketch. Architect shapes. Step 4 implements.
4. Implement the smallest root-cause fix in scope. Remove every named workaround. If the root cause is out of scope, land the smallest in-scope fix and report the rest open. The **principle-fix-root-causes** and **principle-redesign-from-first-principles** skills guide intent only. Neither authorizes widening the fence nor fixing instances outside it. Never bolt on symptom guards.
5. Constraint comments say `do not remove`, `do not change wording`, or `talk to X before changing`. Leave keeps about things we cannot change. Offer the cheapest in-scope type, runtime, test, or CI lint. Wait for interactive approval. Unattended and eval require caller pre-approval. If approved, encode then delete. Otherwise delete, report the constraint open, and sketch out-of-scope work.
6. Report the deletion count, restored comments, reruns, architect sketch, fixes, encoding offers, encodings, unenforced constraints, and other open work.
