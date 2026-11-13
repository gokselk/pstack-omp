# pstack for omp

[pstack](https://github.com/cursor/plugins/tree/main/pstack) by [poteto](https://x.com/poteto), packaged for [omp](https://github.com/can1357/oh-my-pi). It tracks upstream daily.

## install

```bash
omp plugin marketplace add gokselk/pstack-omp
omp plugin install pstack@pstack-omp
```

Start a new session, or run `/reload-plugins` in an open one.

## get started

1. Run `/skill:setup-pstack`. It asks for a reasoning budget and a model for each pstack role, and writes your choices to `~/.omp/agent/rules/pstack-models.md`. It then turns on `task.perCallModel` and approves each model the rule names with its own `pstack-<model-id>` role in `modelRoles`. It keeps those roles in step with the rule and never touches your other roles. omp asks you to approve each settings change. Skip this step to run every subagent on your session model. Everything still works, but the review panels then use one model instead of several.
2. Use `/skill:poteto-mode <task>` for anything that needs rigor.

If you edit the rule by hand, run `/skill:setup-pstack` again so its `pstack-*` roles match the rule.

New here? Read the [pstack guide](plugins/pstack/docs/guide/README.md). Stuck? Ask `/skill:poteto-help`.

Upstream docs write commands as `/name`. In omp, type `/skill:name`. `omp -p` passes `/skill:name` through as plain text, so there write `read skill://poteto-mode and follow it: <task>` instead. Steps that need a Cursor-only feature, such as Bugbot or automations, are skipped with a one-line note.

## update

```bash
omp plugin marketplace update pstack-omp
omp plugin upgrade pstack@pstack-omp
```

## license

MIT, as upstream. See [LICENSE](LICENSE). The plugin also bundles `deslop`, `control-cli`, `control-ui`, and `verify-this` from Cursor's [cursor-team-kit](https://github.com/cursor/plugins/tree/main/cursor-team-kit), because pstack's playbooks run them: `control-ui` names `verify-this`, which drives `control-cli` and `control-ui` for before and after evidence. They are MIT, copyright Cursor, and each one's `LICENSE` sits beside its `SKILL.md`. It also ships `skill-creator`, adapted for omp from Anthropic's [skill-creator](https://github.com/anthropics/skills/tree/main/skills/skill-creator) (Apache-2.0, `LICENSE.txt` in its folder), which stands in for Cursor's `create-skill`. Maintainers: see [MAINTAINING.md](MAINTAINING.md).
