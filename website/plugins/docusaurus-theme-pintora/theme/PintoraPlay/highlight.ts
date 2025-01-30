import * as shiki from 'shiki'

export const shikiLightTheme = 'material-theme'
export const shikiDarkTheme = 'dracula'

let globalHighlighter: shiki.Highlighter
let globalHighlighterPromise: Promise<shiki.Highlighter>

export async function startShiki(opts: { isDarkMode?: boolean } = {}) {
  if (!globalHighlighter) {
    const syntaxJson: shiki.RawGrammar = await (await fetch('/data/pintora.tmLanguage.json')).json()

    const pintoraLanguage: shiki.LanguageRegistration = {
      name: 'pintora',
      scopeName: 'source.pintora',
      embeddedLangsLazy: ['json'],
      ...syntaxJson,
    }

    const theme = opts.isDarkMode ? shikiDarkTheme : shikiLightTheme

    if (!globalHighlighterPromise) {
      globalHighlighterPromise = shiki.getSingletonHighlighter({
        langs: [pintoraLanguage, 'json'],
        themes: [theme],
      })
    }

    const highlighter = await globalHighlighterPromise
    globalHighlighter = highlighter

    await highlighter.loadLanguage(pintoraLanguage)

    globalHighlighterPromise = null
  }

  return { highlighter: globalHighlighter }
}
