# @pintora/renderer 代码结构

本项目是 Pintora 的默认渲染器包，基于 `@antv/g` 图形引擎，提供 SVG 和 Canvas 两种渲染能力。

## 项目依赖

- `@antv/g`: 核心图形引擎
- `@antv/g-canvas`: Canvas 渲染插件
- `@antv/g-svg`: SVG 渲染插件
- `@pintora/core`: Pintora 核心类型和接口

## 目录结构

```
src/
├── index.ts           # 入口文件，导出主要 API
├── type.ts            # 类型定义
├── event.ts           # 事件封装
├── util.ts            # 工具函数
└── renderers/         # 渲染器实现
    ├── index.ts       # 渲染器注册表和工厂函数
    ├── base.ts        # BaseRenderer 抽象基类
    ├── SvgRenderer.ts # SVG 渲染器
    └── CanvasRenderer.ts # Canvas 渲染器
```

## 核心模块说明

### 1. index.ts

主要入口，导出：
- `render(ir, opts)` - 渲染函数，接收 GraphicsIR 和渲染选项
- `makeRenderer` - 渲染器工厂函数
- `BaseRenderer` - 渲染器基类
- `rendererRegistry` - 渲染器注册表
- `GraphicEvent` - 图形事件类
- `IRenderer` - 渲染器接口类型

### 2. type.ts

类型定义文件：
- `EventHandler` - 事件处理器类型（来自 @pintora/core）
- `IRenderer` - 渲染器接口类型（来自 @pintora/core）

### 3. event.ts

`GraphicEvent` 类：
- 将 `@antv/g` 的 FederatedEvent 适配到 Pintora 的 IGraphicEvent 接口
- 封装事件坐标（x, y, clientX, clientY）
- 提供 mark 和 markPath 访问

### 4. util.ts

工具模块：
- `Stack<T>` - 通用栈数据结构
- `noop` - 空函数

### 5. renderers/base.ts

`BaseRenderer` 抽象基类（核心渲染逻辑）：
- 管理 `@antv/g` 的 Canvas 实例
- 实现场景遍历（traverseScene）
- 支持 Group 嵌套
- 处理 Mark 属性预处理（如 path -> d 转换）
- 提供事件绑定（`on` 方法）
- 维护 shapeToMarkMap 用于事件映射

抽象方法：
- `getGRenderer()` - 返回 @antv/g 的渲染器实例
- `getRootElement()` - 获取根 DOM 元素

### 6. renderers/SvgRenderer.ts

SVG 渲染器：
- 继承 `BaseRenderer`
- 使用 `@antv/g-svg` 作为底层渲染器
- 支持手动设置元素 ID（避免自动生成）
- 支持 class 样式设置

### 7. renderers/CanvasRenderer.ts

Canvas 渲染器：
- 继承 `BaseRenderer`
- 使用 `@antv/g-canvas` 作为底层渲染器

### 8. renderers/index.ts

渲染器管理：
- `RendererRegistry` - 渲染器注册表
- `rendererRegistry` - 全局注册表实例
- `makeRenderer(ir, type)` - 渲染器工厂函数
- 支持的类型：'svg' | 'canvas'

## 渲染流程

1. 调用 `render(ir, opts)`
2. 根据 type 创建对应渲染器（默认 SVG）
3. 设置容器 `setContainer()`
4. 创建 `@antv/g` Canvas 实例
5. 调用 `render()` 触发渲染
6. 遍历 GraphicsIR.mark 树结构
7. 为每个 mark 创建对应的 G shape
8. 应用矩阵变换
9. 渲染背景色（如有）

## 扩展方式

如需添加新的渲染类型：
1. 继承 `BaseRenderer` 实现新的渲染器类
2. 实现 `getGRenderer()` 和 `getRootElement()` 方法
3. 使用 `rendererRegistry.register(name, RendererClass)` 注册
