import * as shiki from 'shiki'

export const shikiLightTheme = 'material-default'
export const shikiDarkTheme = 'dracula'

let fetchWasmPromise: Promise<ArrayBuffer> | null = null
let wasmData: ArrayBuffer
async function fetchWasm() {
  // const res = await fetch('/data/onig.wasm')
  if (wasmData) return wasmData

  if (!fetchWasmPromise) {
    fetchWasmPromise = fetch('https://unpkg.com/vscode-oniguruma@1.6.1/release/onig.wasm')
      .then(res => res.arrayBuffer())
      .then(data => {
        wasmData = data
        return wasmData
      })
  }
  return await fetchWasmPromise
}

let globalHighlighter: shiki.Highlighter
let globalHighlighterPromise: Promise<shiki.Highlighter>

export async function startShiki(opts: { isDarkMode?: boolean } = {}) {
  if (!globalHighlighter) {
    const wasmBin = await fetchWasm()
    const syntaxJson = await (await fetch('/data/pintora.tmLanguage.json')).json()

    const pintoraLanguage = {
      id: 'pintora',
      scopeName: 'source.pintora',
      grammar: syntaxJson,
    }

    shiki.setCDN('https://unpkg.com/shiki/')
    // shiki.setCDN('https://cdn.skypack.dev/shiki/')
    shiki.setWasm(wasmBin)

    const theme = opts.isDarkMode ? shikiDarkTheme : shikiLightTheme

    if (!globalHighlighterPromise) {
      globalHighlighterPromise = shiki.getHighlighter({
        langs: [pintoraLanguage, 'json'],
        themes: [shikiLightTheme, shikiDarkTheme],
        theme,
      })
    }

    const highlighter = await globalHighlighterPromise
    globalHighlighter = highlighter

    await highlighter.loadLanguage(pintoraLanguage)

    globalHighlighterPromise = null
  }

  return { highlighter: globalHighlighter }
}
