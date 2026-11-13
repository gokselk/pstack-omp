# pstack for omp

[pstack](https://github.com/cursor/plugins/tree/main/pstack) by [poteto](https://x.com/poteto), packaged for [omp](https://github.com/can1357/oh-my-pi). It tracks upstream daily.

## install

```bash
omp plugin marketplace add gokselk/pstack-omp
omp plugin install pstack@pstack-omp
```

Start a new session, or run `/reload-plugins` in an open one.

## get started

1. Run `/skill:setup-pstack` to pick a reasoning budget and which models pstack uses per role.
2. Use `/skill:poteto-mode <task>` for anything that needs rigor.

New here? Read the [pstack guide](plugins/pstack/docs/guide/README.md). Stuck? Ask `/skill:poteto-help`.

Upstream docs write commands as `/name`. In omp, type `/skill:name`. `omp -p` passes `/skill:name` through as plain text, so there write `read skill://poteto-mode and follow it: <task>` instead. Steps that need a Cursor-only feature, such as Bugbot or automations, are skipped with a one-line note.

## update

```bash
omp plugin marketplace update pstack-omp
omp plugin upgrade pstack@pstack-omp
```

## license

MIT, as upstream. See [LICENSE](LICENSE). The plugin also bundles `deslop`, `control-cli`, `control-ui`, and `verify-this` from Cursor's [cursor-team-kit](https://github.com/cursor/plugins/tree/main/cursor-team-kit), because pstack's playbooks run them: `control-ui` names `verify-this`, which drives `control-cli` and `control-ui` for before and after evidence. They are MIT, copyright Cursor, and each one's `LICENSE` sits beside its `SKILL.md`. Maintainers: see [MAINTAINING.md](MAINTAINING.md).
