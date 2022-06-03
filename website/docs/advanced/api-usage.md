---
title: API Usage
sidebar_position: 1
---

## pintora API

Here is the API of `@pintora/standalone`.

```js
import pintora from '@pintora/standalone'
```

- Use `pintora` if you are using the ESM lib.
- Use `pintora.default` if you are using the UMD lib.

Here are some useful APIs.

```ts
interface PintoraStandalone {
  renderTo(code: string, options: RenderToOptions): void
  renderContentOf(container: HTMLElement, options: RenderContentOptions = {}): void;
}

type RenderContentOptions = {
  /**
   * sometimes you want to customize content rather than simply `innerText`
   */
  getContent?(container: HTMLElement): string | undefined
  /**
   * destination container for result element,
   * if not specified, pintora will create a '.pintora-wrapper' element and insert it before the container
   */
  resultContainer?: HTMLElement
}
```

### renderTo(code, options)

```ts
type RenderToOptions = {
  container: HTMLElement
  renderer?: RendererType
  onRender?(renderer: IRenderer): void
  onError?(error: Error): void
  enhanceGraphicIR?(ir: GraphicsIR): GraphicsIR
  config?: PintoraConfig
  /**
   * An option dict to specify different types of diagram event listeners
   */
  eventsHandlers?: Partial<{
    [K in DiagramEventType]: (diagramEvent: IDiagramEvent) => void;
  }>;
}
```

For example:

```js title=renderTo-example.js
const container = document.createElement('div')
document.body.appendChild(container)

pintora.renderTo(code, {
  container,
  config: {
    themeConfig: {
      theme: 'dark'
    }
  }
})
```

### renderContentOf(container, options?)

This function will call `pintora.renderTo` underneath, and will read some dataset of the container element to get some options for one render.

- `data-renderer`, pintora RendererType, currently `svg` and `canvas` are supported.

For example:

```html title=renderContentOf-example.html
<pre class="pintora" data-renderer="canvas">
mindmap
* Root
** Second
</pre>

<script type="module">
  import pintora from 'https://cdn.skypack.dev/@pintora/standalone'
  document.querySelectorAll('.pintora').forEach((codeElement) => {
    pintora.renderContentOf(codeElement)
  })
</script>
```

### pintora.diagramEventMananger

An event manager for [Diagram Event](diagram-event.md). Let's see the types.

```ts
/**
 * A DiagramEvent eventbus
 */
class DiagramEventManager extends EventEmitter {
  addRecognizer(recognizer: IDiagramEventRecognizer): void

  on<D extends keyof PintoraDiagramItemDatas = any, T extends keyof PintoraDiagramItemDatas[D] = any>(
    evt: DiagramEventType,
    handler: (dEvent: IDiagramEvent<D, T>) => void,
    once?: boolean,
  ): Function
}

const diagramEventManager: DiagramEventManager
```

#### on(evt, handler)

Only the renders that happen after the event binding will trigger the event handler.

In the example below, only the `click` handler will be triggered because it is bound before the render.
 
```ts
const disposeClickListener = pintora.diagramEventManager.on('click', (item) => {
  console.log('diagramEvent click', item)
})

pintora.renderTo(code, {...configs})

const disposeMouseenterListener = pintora.diagramEventManager.on('mouseenter', (item) => {
  console.log('diagramEvent mouseenter', item)
})
```
