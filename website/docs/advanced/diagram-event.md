---
title: Diagram Event
sidebar_position: 3
---

:::info
This event system is still at its early stage, if it does not suit your case, feel free to open feature requests.
:::

Some developers may want to use pintora in their applications which need to respond to user interaction in the rendered diagram.

## Basic concepts

Remember how pintora operates [different levels of intermediate representations](./technical-brief.md#workflow-and-data) during different phases?

When it comes to event handling, this procedure is kind of in reverse order. Don't worry, I'll explain these names later.

```text
 DOM Event
    |
    | `@antv/g` Canvas
    v
 Event
    |
    | () IRenderer
    v
 IGraphicEvent
    |
    | () IDiagram
    v
 IDiagramEvent
    |
    | pintora.diagramEventManager
    v
  listener
```

For example, here is an ER Diagram, imagine you click the 'DELIVERY' entity block (not in this doc page, open it in the live editor and open the devtools console).

```pintora play
erDiagram
  PERSON ||--o{ DELIVERY : makes
```

1. DOM Event is first captured by the underlying `@antv/g` lib, it emits its own `GraphEvent` to the listeners.
2. `IRenderer` listens and handles those events, relates the `graphEvent.shape` with pintora GraphicsIR's `mark`, and emits `IGraphicEvent`.
3. `IDiagram` gets `IGraphicEvent`, relates the `mark` to some logic data of its DiagramIR, this process is called recognition. Each diagram has its unique logic data, so it may implement a recognizer that procudes  several types of item. for example, an er diagram has these types of item:
   1. `type: 'entity'`, `data` is the entity
   2. `type: 'relationship'`, `data` is the relationship between two entities
4. Finally, from the `IDiagramEvent`, you know an entity is clicked.

### Interfaces of the events

```ts
/**
 * Graphic event that triggered from the renderer
 */
export interface IGraphicEvent {
  type: DiagramEventType
  /**
   * Target mark
   */
  mark: Mark | undefined
  /**
   * Mark chain, bottom up from target mark to the top container
   */
  markPath: Mark[] | undefined
  // ...
}
```

```ts
/**
 * Diagram event that recognized and reduced from IGraphicEvent,
 *   has more logic data of the DiagramIR
 */
export interface IDiagramEvent<
  D extends keyof PintoraDiagramItemDatas = any,
  T extends keyof PintoraDiagramItemDatas[D] = any,
> {
  type: DiagramEventType
  graphicEvent: IGraphicEvent
  item: DiagramEventItem<D, T>
}

/**
 * Item that holds data in event payload
 */
export type DiagramEventItem<
  D extends keyof PintoraDiagramItemDatas = any,
  T extends keyof PintoraDiagramItemDatas[D] = any,
> = {
  /**
   * From which diagram
   */
  diagram: D
  /**
   * Data item type, e.g. 'entity' in a er diagram
   */
  type: T
  /**
   * Often relates to `mark.itemId`
   */
  id: string
  /**
   * Extra data that has different shape, depending on the type
   */
  data?: PintoraDiagramItemDatas[D][T]
}

/**
 * An interface that holds diagram item data types and shapes.
 * Like `PintoraConfig`, this interface can be augmented later as more diagrams are being added.
 *
 * P.S. The default key `unknown` is just a placeholder for type inference, don't use it.
 */
export interface PintoraDiagramItemDatas {
  unknown: {
    unknown: unknown
  }
}
```

## Available diagram events

Diagram event recognition is not required for diagram implementation, only somes of the diagram will produce diagram events.

After extending by ER Diagram, the data shape is like:

```ts
interface PintoraDiagramItemDatas {
  er: {
    entity: Entity
    relationship: Relationship
  }
  sequence: {
    actor: Actor
    message: Message
  }
}
```

So if you listens to the events, click the entity, and you will get the callback data:

```js
pintora.diagramEventManager.on('click', (dEvent) => {
  console.log('diagramEvent click', dEvent.item)
  // {
  //   diagram: 'er',
  //   type: 'entity',
  //   id: 'entity-DELIVERY',
  //   data: {
  //     name: 'DELIVERY',
  //     // .. other properties of the entity
  //   },
  // }
})
```
