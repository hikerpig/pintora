---
title: API Usage
sidebar_position: 1
---

## pintora API in the browser

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
<pre className="pintora" data-renderer="canvas">
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

## pintora API in Node.js (@pintora/cli)

It's a little bit more complicated in Node.js than in the browser, we need to borrow some power from `jsdom` or `node-canvas`. Some wrapper functions are exported from the `@pintora/cli` package - the same one described in the [Cli Usage Doc](../getting-started/usage.mdx#cli), but this time we use it as a Node.js library.

### render(options)

```ts
export type CLIRenderOptions = {
  /**
   * pintora DSL to render
   */
  code: string
  devicePixelRatio?: number | null
  mimeType?: string
  /**
   * Assign extra background color
   */
  backgroundColor?: string
  pintoraConfig?: Partial<PintoraConfig>
  /**
   * width of the output, height will be calculated according to the diagram content ratio
   */
  width?: number
}

export function render(options: CLIRenderOptions): Promise<string | buffer>
```

Current supported `mimeType`

- image/svg+xml
- image/jpeg
- image/png

Some example code:

```ts title=nodejs-render-example.ts
import { render, PintoraConfig } from '@pintora/cli'
import * as fs from 'fs'

const buildSVG = async (code: string, config?: Partial<PintoraConfig>) => {
  const str = await render({
    code: code,
    pintoraConfig: config,
    mimeType: 'image/svg+xml',
    width: 1000,
    backgroundColor: '#fff',
  })
  fs.writeFileSync('example.svg', str)
}

const buildPNG = async (code: string, config?: Partial<PintoraConfig>) => {
  const buf = await render({
    code: code,
    pintoraConfig: config,
    mimeType: 'image/png',
    width: 800,
    backgroundColor: '#fdfdfd', // use some other background color
  })
  fs.writeFileSync('example.png', buf)
}

const code = `
activityDiagram
start
:render functionl called;
if (is mimeType image/svg+xml ?) then
  :renderer svg;
  :render with jsdom;
  :generate string;
else (no)
  :renderer canvas;
  :render with node-canvas;
  :generate image buffer by mimeType;
endif

:return result;

end
`

buildSVG(code)

buildPNG(code)
```

## pitora in WinterCG runtime

<span className="badge badge--info">Experiment</span> This is still at a very early stage and need more examples.

> The Web-interoperable Runtimes Community Group (WinterCG) is a community of people who are interested in using Web Platform APIs outside of browsers, namely on the server (Deno / Node.js) or edge runtimes (Cloudflare Workers / Deno).

There are some [WinterCG](https://wintercg.org/) compatible runtimes nowadays, pintora tries its best to be able to run in a [Minimum Common Web Platform API](https://common-min-api.proposal.wintercg.org/) runtime.

There is a package [@pintora/target-wintercg](https://www.npmjs.com/package/@pintora/target-wintercg) providing bundled JS file containing pintora and its dependencies.

**Some notes**:
- almost all Node.js module dependencies is replaced with JS polyfills, so bundle size is not very pleasent - about 2.24MB without minify for now.
- text-metric is implemented with the help of `fontkit`, this eliminates our dependency of `node-canvas` - or more precisely, CanvasRenderingContext2D's [`measureText()`](https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/measureText).

**Limitations**:

- font loading is not yet supported, all the text-metric is calculated with `SourceCode Pro-Medium.ttf` font data pre-bundled into the JS file.
- only `svg` renderer is supported in this runtime.

**types**:

```ts
import pintoraStandalone from '@pintora/standalone'

export type RuntimeRenderOptions = {
  /**
   * pintora DSL to render
   */
  code: string
  devicePixelRatio?: number | null
  mimeType?: string
  /**
   * Assign extra background color
   */
  backgroundColor?: string
  // pintoraConfig?: DeepPartial<PintoraConfig>
  /**
   * width of the output, height will be calculated according to the diagram content ratio
   */
  width?: number
}

export async function render(opts: RuntimeRenderOptions): Promise<{
  type: string
  data: any
}>

export default pintoraStandalone
```

### render(options)

```js
import { render } from '@pintora/target-wintercg'

render({
  code: `
mindmap
title: Mind Map levels
* UML Diagrams
** Behavior Diagrams
*** Sequence Diagram
*** State Diagram
  `
})
```
