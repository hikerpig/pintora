---
sidebar_position: 1
---

# Intro

Pintora is a javascript text-to-diagrams library that works in both browser and Node.js.

Expressing your thoughts in a diagram is better than a thousand words. With the help of pintora.js, you can create diagrams with intuitive text.

Heavily inspired by [Mermaid.js](https://mermaid-js.github.io/mermaid/#/) and [PlantUML](https://plantuml.com/).

## Features

- In browser side, output SVG or Canvas.
- In Node.js side, output PNG/JPG/SVG file.
- \[Planning\] Modular and composable, load specific diagram implementaions only when needed, keep the core code lightweight.
- Highly extensible, provide a plugin system for diagram developer to write and distribute their own diagrams. See [Write a custom diagram](./advanced/write-a-custom-diagram.md)

## Diagram types

- [Sequence Diagram](./diagrams/sequence-diagram.mdx)
- [Entity Relationship Diagram](./diagrams/er-diagram.mdx)
- [Component Diagram](./diagrams/component-diagram.mdx)
- [Activity Diagram](./diagrams/activity-diagram.mdx)
- [Mind Map](./diagrams/mindmap.mdx) <span class="badge badge--info">Experiment</span>

```pintora play
mindmap
@param layoutDirection TB
* Pintora diagrams
** UML Diagrams
*** Sequence Diagram
*** Activity Diagram
*** Component Diagram
** Non-UML Diagrams
*** Entity Relationship Diagram
*** Mind Map
```

## 💻 Editor Support

- VSCode extension [pintora-vscode](https://marketplace.visualstudio.com/items?itemName=hikerpig.pintora-vscode), providing syntax highlight and preview support for `.pintora` file and markdown code fence.
