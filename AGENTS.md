# Pintora — Agent Map

Pintora is a TypeScript text-to-diagram library for browser and Node. The repo is a monorepo managed with pnpm workspaces and Turbo.

## Where to look

| Task | Go to |
|------|-------|
| Edit code inside a package | `packages/<pkg>/AGENTS.md` |
| Add a new diagram type (parser + artist + config) | [`.ai/skills/add-new-diagram/SKILL.md`](.ai/skills/add-new-diagram/SKILL.md) |
| Cross-package architecture, data flow, terminology | [`.ai/docs/README.md`](.ai/docs/README.md) |
| Why a past decision was made | [`.ai/docs/adr/README.md`](.ai/docs/adr/README.md) |
| User-facing documentation | `website/docs/` |

## Repo quick-facts

- 9 packages: `pintora-core` (registry + theme + config), `pintora-diagrams` (diagram implementations), `pintora-renderer`, `pintora-standalone`, `pintora-cli`, `pintora-target-wintercg`, `pintora-harness` (agent observability harness), `development-kit`, `test-shared`.
- Internal dependencies use pnpm workspace protocol.
- Diagram types: sequence, er, component, activity, mindmap, gantt, dot, class, usecase.

## Commands

```bash
pnpm install
pnpm compile        # build all packages
pnpm test           # Jest test suite
pnpm watch          # turbo watch mode
pnpm demo:dev       # local demo site
pnpm website:dev    # local docs site
pnpm ai:link        # symlink .ai/skills into tool dirs
pnpm ai:lint        # validate .ai/ and AGENTS.md links
```

## Hard rules

- Before editing inside a package, read its `AGENTS.md`. Do not infer conventions from one example file.
- When adding a diagram, follow the `add-new-diagram` skill end-to-end; skipping steps misses registration, snapshots, or standalone wiring.
- Snapshot diffs require human review. Never run Jest with `--updateSnapshot` blindly.
- pnpm only. Do not introduce npm or yarn lockfiles.
