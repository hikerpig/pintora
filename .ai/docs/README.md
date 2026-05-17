# Pintora AI Docs

Tool-neutral internal knowledge. Linked from root [`AGENTS.md`](../../AGENTS.md) and per-package agent notes; deduplicates content that would otherwise sprawl across files.

## Index

| Topic                         | Doc                                                                |
| ----------------------------- | ------------------------------------------------------------------ |
| System overview and data flow | [architecture/overview.md](architecture/overview.md)               |
| ASCII text plan authoring     | [ascii-text-plan-authoring.md](ascii-text-plan-authoring.md)       |
| Diagram three-piece pattern   | [patterns/diagram-three-piece.md](patterns/diagram-three-piece.md) |
| Glossary                      | [glossary.md](glossary.md)                                         |
| Historical decisions          | [adr/README.md](adr/README.md)                                     |

## Writing rules

- Write the why and the surprising parts; do not restate what code obviously says.
- Cite code as `path:line` (for example `packages/pintora-core/src/diagram-registry.ts:42`).
- When a doc goes stale, fix it or delete it. Do not leave corpses.
- Keep each doc focused; split when it grows beyond a single topic.
