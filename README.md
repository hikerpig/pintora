# Pintora

<img width="120" src="https://raw.githubusercontent.com/hikerpig/pintora/master/demo/public/img/logo.svg" />

Pintora is a javascript text-to-diagrams library that works in both browser and Node.js.

Expressing your thoughts in a diagram is better than a thousand words. With the help of pintora.js, you can create diagrams with intuitive text.

Heavily inspired by [Mermaid.js](https://mermaid-js.github.io/mermaid/#/) and [PlantUML](https://plantuml.com/).

## ✨ Features

- In browser side, output SVG or Canvas.
- In Node.js side, output PNG/JPG file.
- \[Planning\] Modular and composable, load specific diagram implementaions only when needed, keep the core code lightweight.
- Highly extensible, provide a plugin system for diagram developer to write and distribute their own diagrams.

### Diagram types

- Sequence Diagram
- Entity Diagram
- Component Diagram

Check the online [documentation and demo](http://pintorajs.vercel.app/) for more details.

🚧 This project is currently under active development, if you have good thoughts or feature requests, please feel free to [start a new discussion](https://github.com/hikerpig/pintora/discussions).

## Roadmap

- [x] Sequence Diagram and Entity Relationship Diagram
- [x] Pintora node.js cli
- [x] PlantUML style Component diagram
- [ ] Load diagram implementation and canvas renderer only when needed
- [ ] Theme config
