---
title: API Usage
---

## pintora API

Here is the API of `@pintora/standalone`.

```js
import pintora from '@pintora/standalone'
```

- Use `pintora` if your are using the ESM lib.
- Use `pintora.default` if your are using the UMD lib.

Here are some usefule APIs.

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

- `data-renderer`, pintora RendererType, currently `svg` and `canvas` is supported.

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
