---
title: 自定义样式
---

目前各个图表可以通过 `@param` 和 `@config` 设置变量值来改变图表内的样式，但仍有一些小问题:

1. 不同图表由于语法和逻辑实体不同，变量名称不完全相同
2. 无法为某个单独的元素指定样式

因此我们引入一种新的配置方式:

1. 支持配置通用的样式属性
2. 可以为单独元素绑定类型和指定样式

这个配置方式的优先级高于 `@param` 和 `@config`。它长得有点像 CSS，但并不完全一致。

## 示例

```pintora play
@pre
@style {
  .people {
    textColor: blue;
    fontStyle: italic;
  }
}
@endpre

erDiagram
  title: Custom Style Example
  PERSON
  CUSTOMER inherit PERSON
  CUSTOMER ||--o{ ORDER : places

  @bindClass entity-CUSTOMER people
  @bindClass entity-PERSON people
```

## 基本概念

### 可以设置样式的属性

与各个图表各不相同的 config 不一样，样式属性相对较为统一，目前只有以下关于样式的属性可以被设置。

```ts
import { MarkAttrs } from '@pintora/core'

export type StylableAttrs = {
  backgroundColor: string
  borderColor: string
  fontFamily: MarkAttrs['fontFamily']
  fontStyle: MarkAttrs['fontStyle']
  fontWeight: MarkAttrs['fontWeight']
  opacity: MarkAttrs['opacity']
  textColor: string
}
```

## @style 指令

`@style` 指令只能在 `@pre` 块内出现。它的语法如下:
```pintora
@pre
@style {
  #id {
    <...style-attrs>
  }
  .class {
    <...style-attrs>
  }
}
@endpre
```

### 样式选择符

1. `.class`。用于选中样式类。
1. `#id`。用于选择具体元素，id 名称的构成在各种图表中都不一样，请查阅各个图表的文档。

## @bindClass 指令

此指令用于将图表的特定 id 的元素绑定到样式类。它的语法如下:

```pintora
@bindClass id1,id2 <style-class>
```

一个例子:

```pintora play
@pre
@style {
  .cls-c1 {
    textColor: red;
  }
  #node-C1 {
    backgroundColor: #c5ff64;
  }
  #node-C2 {
    backgroundColor: #ffe664;
  }
  .cls-c3 {
    textColor: #ffffff;
    backgroundColor: #64a1ff;
  }
}
@endpre

componentDiagram
  title: Component Style Example
  [C1]
  [C2]
  [Component 3] as C3

@bindClass node-C3 cls-c3
```
