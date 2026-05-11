# .ai/

Tool-neutral source of truth for in-repo AI agents (Claude Code, Codex, Gemini CLI) and contributors.

## Contents

- `docs/` — shared knowledge: architecture, patterns, glossary, decisions.
- `skills/` — imperative task recipes (`<name>/SKILL.md` with frontmatter).

## Routing

- Start at the root [`AGENTS.md`](../AGENTS.md) for the full map.
- See [`.ai/docs/README.md`](docs/README.md) for the knowledge index.

## Tool integration

- Claude Code reads `.claude/skills/`. Run `pnpm ai:link` to symlink each skill from `.ai/skills/` into `.claude/skills/`.
- Codex and Gemini CLI read `AGENTS.md` directly; they discover skills via that map.

## Maintenance

- `pnpm ai:lint` validates SKILL.md frontmatter, internal links, and AGENTS.md path references.
- Keep this directory tool-agnostic. Tool-specific adapters live under `scripts/` or under each tool's native config directory.
