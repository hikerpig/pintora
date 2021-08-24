# Pintora

<p align='center'>
  <img width="140" src="https://raw.githubusercontent.com/hikerpig/pintora/master/demo/public/img/logo.svg" alt="pintora" />
</p>

<p align='center'>
  <a href='https://www.npmjs.com/package/@pintora/standalone'>
  <img src='https://img.shields.io/npm/v/@pintora/standalone?color=ff8150&label=@pintora/standalone'>
  <img src="https://badgen.net/bundlephobia/minzip/@pintora/standalone">
</a>
</p>

<br>

Pintora is a javascript text-to-diagrams library that works in both browser and Node.js.

Expressing your thoughts in a diagram is better than a thousand words. With the help of pintora.js, you can create diagrams with intuitive text.

Heavily inspired by [Mermaid.js](https://mermaid-js.github.io/mermaid/#/) and [PlantUML](https://plantuml.com/).

## ✨ Features

- In browser side, output SVG or Canvas.
- In Node.js side, output PNG/JPG file.
- \[Planning\] Modular and composable, load specific diagram implementaions only when needed, keep the core code lightweight.
- \[Planning\] Highly extensible, provide a plugin system for diagram developer to write and distribute their own diagrams.

### Diagram types

- Sequence Diagram
- Entity Relationship Diagram
- Component Diagram

Check the online [documentation and demo](http://pintorajs.vercel.app/docs/intro/) for more details.

🚧 This project is currently under active development, if you have good thoughts or feature requests, please feel free to [start a new discussion](https://github.com/hikerpig/pintora/discussions).

## 🔭 Roadmap

- [x] Sequence Diagram and Entity Relationship Diagram
- [x] Pintora node.js cli
- [x] PlantUML style Component diagram
- [x] Theme config
- [ ] PlantUML style activity diagram, or Mermaid's flowchart
- [ ] PlantUML style deploy diagram
- [ ] Load diagram implementation and canvas renderer only when needed
