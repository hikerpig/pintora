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
- [Mind Map](./diagrams/mindmap.mdx) <span className="badge badge--info">Experiment</span>
- [Gantt Diagram](./diagrams/gantt-diagram.mdx) <span className="badge badge--info">Experiment</span>
- [DOT Diagram](./diagrams/dot-diagram.mdx) <span className="badge badge--info">Experiment</span>
- [Class Diagram](./diagrams/class-diagram.mdx)

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
*** Gantt Diagram
*** DOT Diagram
```

## 💻 Editor Support

- VSCode extension [pintora-vscode](https://marketplace.visualstudio.com/items?itemName=hikerpig.pintora-vscode), providing syntax highlight and preview support for `.pintora` file and markdown code fence.

## Related Projects

- [gatsby-remark-pintora](https://github.com/hikerpig/gatsby-remark-pintora) A gatsby remark plugin for converting pintora codeblock to diagrams in markdown files.
- [Pintora.js - Diagram as text / hikerpig / Observable](https://observablehq.com/@hikerpig/pintora-js-diagram-as-text), use pintora in Observable interactive notebook.
- [pintora-stencil - Pintora Web Components](https://github.com/hikerpig/pintora-stencil), web component for showing pintora diagram preview, add it into your website simply by import some script tags.
- [obsidian-pintora](https://github.com/amiaslee/obsidian-pintora), created by [@amiaslee](https://github.com/amiaslee). An Obsidian plugin based on Pintora, which allows users to create diagrams using Pintora syntax directly in the Obsidian editor. It's local, secure, fast, and easy to use.