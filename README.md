# pstack for omp

[pstack](https://github.com/cursor/plugins/tree/main/pstack) by [poteto](https://x.com/poteto), packaged for [omp](https://github.com/can1357/oh-my-pi). It tracks upstream daily.

## install

```bash
omp plugin marketplace add gokselk/pstack-omp
omp plugin install pstack@pstack-omp
```

Start a new session, or run `/reload-plugins` in an open one.

## get started

1. Run `/skill:setup-pstack`. It asks for a reasoning budget and a model for each pstack role, and saves your choices as a rule. omp asks you to approve each settings change it makes. If you skip this step, every subagent runs on your session model.
2. Use `/skill:poteto-mode <task>` for any task that needs rigor. Give the goal and a check that can pass or fail.

If you edit the rule by hand, run `/skill:setup-pstack` again.

New to pstack? Read the [pstack guide](plugins/pstack/docs/guide/README.md). Stuck? Ask `/skill:poteto-help`.

## differences in omp

pstack is written for Cursor. Each skill carries the omp mapping for the Cursor names it uses, so most of pstack works as written. These parts change:

- Upstream docs write commands as `/name`. In omp, type `/skill:name`.
- `omp -p` passes `/skill:name` through as plain text. There, write `read skill://poteto-mode and follow it: <task>` instead.
- Steps that need a Cursor-only feature are skipped with a one-line note.

## update

```bash
omp plugin marketplace update pstack-omp
omp plugin upgrade pstack@pstack-omp
```

The first command refreshes the catalog, and the second installs the newer version. Then start a new session, or run `/reload-plugins` in an open one.

If you use per-role models, run `/skill:setup-pstack` again after an upgrade.

## bundled skills

pstack's playbooks run some skills that pstack does not ship, so this plugin ships them too:

- `deslop`, `control-cli`, `control-ui`, and `verify-this` from Cursor's [cursor-team-kit](https://github.com/cursor/plugins/tree/main/cursor-team-kit).
- `skill-creator`, adapted for omp from Anthropic's [skill-creator](https://github.com/anthropics/skills/tree/main/skills/skill-creator). It replaces Cursor's built-in `create-skill`.

These skills load only when a pstack skill runs them or you type `/skill:<name>`.

## license

pstack is MIT, as upstream. See [LICENSE](LICENSE). The cursor-team-kit skills are MIT, copyright Cursor, and each one has its `LICENSE` beside its `SKILL.md`. `skill-creator` is Apache-2.0, with its `LICENSE.txt` in its folder.

Maintainers: see [MAINTAINING.md](MAINTAINING.md).
