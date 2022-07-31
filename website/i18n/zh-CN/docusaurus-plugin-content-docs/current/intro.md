---
sidebar_position: 1
---
# 介绍

Pintora 是一个可在浏览器和 Node.js 环境下运行的文字转示意图库。

受到 [Mermaid.js](https://mermaid-js.github.io/mermaid/#/) 和 [PlantUML](https://plantuml.com/) 的启发，帮助用户通过简单直观的语言来定义和绘制示意图。

通过标准化的图形展示，表达复杂的思想结构和意图，一图胜千言。

## 特性

- 在浏览器端，支持 SVG 和 Canvas 输出
- 在 Node.js 端，支持输出 PNG/JPG 位图和 SVG 文件
- \[计划中\] 具有高度的可组合性，按需加载图表类型，核心代码可控制在较轻量级
- 具有高度的可扩展性，开发者可扩展自己的图表，作为插件接入，详情请见 [实现你自己的图表](./advanced/write-a-custom-diagram.md)

## 支持图表

- [时序图 Sequence Diagram](./diagrams/sequence-diagram.mdx)
- [实体关系图 Entity Relationship Diagram](./diagrams/er-diagram.mdx)
- [组件图 Component Diagram](./diagrams/component-diagram.mdx)
- [活动图 Activity Diagram](./diagrams/activity-diagram.mdx)
- [思维导图 Mind Map](./diagrams/mindmap.mdx) <span className="badge badge--info">实验中</span>
- [甘特图 Gantt Diagram](./diagrams/gantt-diagram.mdx) <span className="badge badge--info">实验中</span>
- [DOT Diagram](./diagrams/dot-diagram.mdx) <span className="badge badge--info">实验中</span>

```pintora play
mindmap
@param layoutDirection TB
* Pintora diagrams
** UML 图表
*** 时序图 Sequence Diagram
*** 活动图 Activity Diagram
*** 组件图 Component Diagram
** Non-UML Diagrams
*** 实体关系图 Entity Relationship Diagram
*** 思维导图 Mind Map
*** 甘特图 Diagram
```

## 💻 编辑器支持

- VSCode 插件 [pintora-vscode](https://marketplace.visualstudio.com/items?itemName=hikerpig.pintora-vscode), 提供 `.pintora` 文件的语法高亮和 Markdown 代码块预览等功能。
