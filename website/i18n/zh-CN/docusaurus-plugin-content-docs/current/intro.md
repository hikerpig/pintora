---
sidebar_position: 1
---
# 介绍

Pintora 是一个可在浏览器和 Node.js 环境下运行的文字转示意图库。

受到 [Mermaid.js](https://mermaid-js.github.io/mermaid/#/) 和 [PlantUML](https://plantuml.com/) 的启发，帮助用户通过简单直观的语言来定义和绘制示意图。

通过标准化的图形展示，表达复杂的思想结构和意图，一图胜千言。

## 特性

- 在浏览器端，支持 SVG 和 Canvas 输出
- \[编写中\] 在 Node.js 端，支持输出 PNG 位图
- \[计划中\] 具有高度的可组合性，按需加载图表类型，核心代码可控制在较轻量级
- 具有高度的可扩展性，开发者可扩展自己的图表，作为插件接入，详情请见 [实现你自己的图表](#实现你自己的图表)

## 支持图表

- [时序图 Sequence Diagram](./diagrams/sequence-diagram)
- ER 图

## 实现你自己的图表

TBD

<!-- Pintora 通过合理的分层和抽象，为图表作者建立一套从 DSL 解析到图形绘制的简化工具链。

- 可使用任意 parser 库实现 DSL 解析，推荐使用 Nearley.js
- 可基于 pintora 提供的图形表示格式 (GraphicsIR) 构建自己的图表渲染逻辑 -->
