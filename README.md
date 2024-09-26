# Pintora

<p align='center'>
  <img width="140" src="https://raw.githubusercontent.com/hikerpig/pintora/master/demo/public/img/logo.svg" alt="pintora" />
</p>
<p align='center'>
  <a href="http://pintorajs.vercel.app/docs/intro/">Documentation</a>
  <span>|</span>
  <a href="http://pintorajs.vercel.app/demo/live-editor/">Live Editor</a>
</p>

<p align='center'>
  <a href='https://www.npmjs.com/package/@pintora/standalone'>
    <img src='https://img.shields.io/npm/v/@pintora/standalone?color=ff8150&label=@pintora/standalone' />
  </a>
  <a href="https://bundlephobia.com/package/@pintora/standalone">
    <img src="https://img.shields.io/bundlephobia/min/@pintora/standalone" />
  </a>
  <a href="https://percy.io/3f73ea87/pintora">
    <img src="https://percy.io/static/images/percy-badge.svg" />
  </a>
</a>
</p>

<br>

> **pintora** Spanish for "female painter"

Pintora is an extensible javascript text-to-diagrams library that works in both browser and Node.js.

Expressing your thoughts in a diagram is better than a thousand words. With the help of pintora.js, you can create diagrams with intuitive text.

Heavily inspired by [Mermaid.js](https://mermaid-js.github.io/mermaid/#/) and [PlantUML](https://plantuml.com/).

## ✨ Features

- In browser side, output SVG or Canvas.
- In Node.js side, output PNG/JPG/SVG file.
- Outputs are clean and self contained, won't pollute the page with global style.
- Modular and highly extensible, provide a plugin system for diagram developer to write and distribute their own diagrams. Here is a tutorial [Write a custom diagram | Pintora](https://pintorajs.vercel.app/docs/advanced/write-a-custom-diagram/).

### Diagram types

<table>
  <thead>
    <tr>
      <th>name</th>
      <th>preview</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>Sequence Diagram</td>
      <td>
        <img src="https://i.imgur.com/6CMLz7C.jpg" title="Sequence Diagram" width="300" />
      </td>
    </tr>
    <tr>
      <td>Entity Relationship Diagram</td>
      <td>
        <img src="https://i.imgur.com/o31ydlQ.jpg" title="Entity Relationship Diagram" width="300" />
      </td>
    </tr>
    <tr>
      <td>Component Diagram</td>
      <td>
        <img src="https://i.imgur.com/yk68Ot5.jpg" title="Component Diagram" width="300" />
      </td>
    </tr>
    <tr>
      <td>Activity Diagram</td>
      <td>
        <img src="https://i.imgur.com/HoMe3Gp.jpg" title="Activity Diagram" width="300" />
      </td>
    </tr>
    <tr>
      <td>Mind Map</td>
      <td>
        <img src="https://i.imgur.com/jT6HQg6.jpg" title="Mind Map" width="300" />
      </td>
    </tr>
    <tr>
      <td>Gantt Diagram</td>
      <td>
        <img src="https://i.imgur.com/hwcK3cT.jpg" title="Gantt Diagram" width="300" />
      </td>
    </tr>
    <tr>
      <td>DOT Diagram</td>
      <td>
        <img src="https://i.imgur.com/KCkYXlk.png" title="DOT Diagram" width="300" />
      </td>
    </tr>
    <tr>
      <td>Class Diagram</td>
      <td>
        <img src="https://i.imgur.com/mqLIwcD.png" title="Class Diagram" width="300" />
      </td>
    </tr>
  </tbody>
</table>

## 📖 Documentation

Check the online [documentation and demo](http://pintorajs.vercel.app/docs/intro/) for more details.

## 💻 Editor Support

- VSCode extension [pintora-vscode](https://marketplace.visualstudio.com/items?itemName=hikerpig.pintora-vscode), providing syntax highlight and preview support for `.pintora` file and markdown code fence.

## Related Projects

- [gatsby-remark-pintora](https://github.com/hikerpig/gatsby-remark-pintora) A gatsby remark plugin for converting pintora codeblock to diagrams in markdown files.
- [Pintora.js - Diagram as text / hikerpig / Observable](https://observablehq.com/@hikerpig/pintora-js-diagram-as-text), use pintora in Observable interactive notebook.
- [pintora-stencil - Pintora Web Components](https://github.com/hikerpig/pintora-stencil), web component for showing pintora diagram preview, add it into your website simply by import some script tags.
- [obsidian-pintora](https://github.com/amiaslee/obsidian-pintora), created by [@amiaslee](https://github.com/amiaslee). An Obsidian plugin based on Pintora, which allows users to create diagrams using Pintora syntax directly in the Obsidian editor. It's local, secure, fast, and easy to use.

## 🔭 Roadmap

- [x] Sequence Diagram and Entity Relationship Diagram
- [x] Pintora node.js cli
- [x] PlantUML style Component diagram
- [x] Theme config
- [x] PlantUML style Activity Diagram
- [x] Mind Map
- [x] Gantt Diagram
- [x] Class Diagram
- [ ] Universal style customization solution
- [ ] Load diagram implementation and canvas renderer only when needed

If you have good thoughts or feature requests, please feel free to [start a new discussion](https://github.com/hikerpig/pintora/discussions).
