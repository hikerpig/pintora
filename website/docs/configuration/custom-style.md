---
title: Custom Style
---

Currently, various charts can change the styles within the charts by setting variable values through `@param` and `@config`, but there are still some minor issues:

1. Different charts have different variable names due to varying syntax and logical entities
2. It is not possible to specify styles for a single element

Therefore, we introduce a new configuration method:

1. Supports configuring common style properties
2. Allows binding types and specifying styles for individual elements

This configuration method takes precedence over `@param` and `@config`. It looks somewhat like CSS, but is not exactly the same.

## Example

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

## Basic Concepts

### Styling Properties

Unlike the config properties that vary across different charts, styling properties are relatively uniform. Currently, only the following styling properties can be set.

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

## @style Directive

The `@style` directive can only appear within the `@pre` block. Its syntax is as follows:

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

### Style Selectors

1. `.class`. Used to select style classes.
1. `#id`. Used to select specific elements, the id name composition varies across different charts, please refer to the documentation of each chart.

## @bindClass Directive

This directive is used to bind the style class to the specific id elements of the chart. Its syntax is as follows:

```pintora
@bindClass id1,id2 <style-class>
```

Some example:

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
