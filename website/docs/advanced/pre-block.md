---
title: Pre Block
---

A pre block comes before actual diagram keyword, it starts with `@pre` and ends with `@endpre`.

This allows for passing common information to the diagram, facilitating easier maintenance of grammar and parser across various types of diagrams.

```pintora play
@pre
@param entityBackground #61afef
@title @pre block example
@endpre

classDiagram
  class Animal {
  }

  class Dog {
    void bark()
  }

  Animal <|-- Dog
```

## Set title with `@title`

You can set title with `@title`. It will be used as a part of the actual diagram title.

If the diagram has its own title grammar, this will be overridden by the later value you provide.

However, since title grammar may vary from one diagram to another, it is easier to remember to use the @title directive.

## Override config in pre block

You can use `@param` and `@config` directive inside pre block to override config. Check the [Config documentation](configuration/config.md#override-config-by-directive) for available options.
