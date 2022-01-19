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
- In Node.js side, output PNG/JPG/SVG file.
- Outputs are clean and self contained, won't pollute the page with global style.
- Modular and highly extensible, provide a plugin system for diagram developer to write and distribute their own diagrams.

### Diagram types

- Sequence Diagram
- Entity Relationship Diagram
- Component Diagram
- Activity Diagram
- Mind Map

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
        <img src="https://i.imgur.com/6CMLz7C.jpg" title="source: imgur.com" width="300" />
      </td>
    </tr>
    <tr>
      <td>ER Diagram</td>
      <td>
        <img src="https://i.imgur.com/o31ydlQ.jpg" title="source: imgur.com" width="300" />
      </td>
    </tr>
    <tr>
      <td>Component Diagram</td>
      <td>
        <img src="https://i.imgur.com/yk68Ot5.jpg" title="source: imgur.com" width="300" />
      </td>
    </tr>
    <tr>
      <td>Activity Diagram</td>
      <td>
        <img src="https://i.imgur.com/HoMe3Gp.jpg" title="source: imgur.com" width="300" />
      </td>
    </tr>
    <tr>
      <td>Mind Map</td>
      <td>
        <img src="https://i.imgur.com/FqoVe32.jpg" title="source: imgur.com" width="300" />
      </td>
    </tr>
  </tbody>
</table>

## 📖 Documentation

Check the online [documentation and demo](http://pintorajs.vercel.app/docs/intro/) for more details.

## 💻 Editor Support

- VSCode extension [pintora-vscode](https://marketplace.visualstudio.com/items?itemName=hikerpig.pintora-vscode), providing syntax highlight and preview support for `.pintora` file and markdown code fence.

## 🔭 Roadmap

- [x] Sequence Diagram and Entity Relationship Diagram
- [x] Pintora node.js cli
- [x] PlantUML style Component diagram
- [x] Theme config
- [x] PlantUML style Activity diagram
- [x] Mind Map
- [ ] PlantUML style deploy diagram
- [ ] Load diagram implementation and canvas renderer only when needed

If you have good thoughts or feature requests, please feel free to [start a new discussion](https://github.com/hikerpig/pintora/discussions).
