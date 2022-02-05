// import * as vsctm from 'vscode-textmate'
import * as shiki from 'shiki'

const TEST_TEXT = `
mindmap
* Root
** Second
    `

async function fetchWasm() {
  const res = await fetch('/data/onig.wasm')
  return await res.arrayBuffer()
}

// async function start() {
//   const wasmBin = await fetchWasm()
//   const vscodeOnigurumaLib = oniguruma.loadWASM(wasmBin).then(() => {
//     return {
//       createOnigScanner(patterns) {
//         return new oniguruma.OnigScanner(patterns)
//       },
//       createOnigString(s) {
//         return new oniguruma.OnigString(s)
//       },
//     }
//   })
//   const registry = new vsctm.Registry({
//     onigLib: vscodeOnigurumaLib,
//     loadGrammar: async scopeName => {
//       console.log('loadGrammar', scopeName)
//       let grammar = null

//       if (/pintora/.test(scopeName)) {
//         const syntax = await (await fetch('/data/pintora.tmLanguage.json')).text()
//         grammar = vsctm.parseRawGrammar(syntax, 'pintora.tmLanguage.json')
//       }
//       return grammar
//     },
//   })

//   // console.log('registry', registry)

//   registry.loadGrammar('source.pintora').then(grammar => {
//     const lines = TEST_TEXT.split('\n')

//     let ruleStack = vsctm.INITIAL
//     for (let i = 0; i < lines.length; i++) {
//       const line = lines[i]
//       const lineTokens = grammar?.tokenizeLine(line, ruleStack)
//       // console.log('tokens', lineTokens)

//       if (lineTokens) {
//         for (let j = 0; j < lineTokens.tokens.length; j++) {
//           const token = lineTokens.tokens[j]
//           console.log(
//             ` - token from ${token.startIndex} to ${token.endIndex} ` +
//               `(${line.substring(token.startIndex, token.endIndex)}) ` +
//               `with scopes ${token.scopes.join(', ')}`,
//           )
//         }

//         ruleStack = lineTokens.ruleStack
//       }
//     }
//   })

//   return registry
// }

async function startShiki() {
  const wasmBin = await fetchWasm()
  const syntaxJson = await (await fetch('/data/pintora.tmLanguage.json')).json()

  const pintoraLanguage = {
    id: 'pintora',
    scopeName: 'source.pintora',
    grammar: syntaxJson,
  }

  shiki.setCDN('https://unpkg.com/shiki/')
  shiki.setWasm(wasmBin)

  const highlighter = await shiki.getHighlighter({
    langs: [pintoraLanguage, 'json'],
    themes: ['material-palenight', 'dracula'],
    theme: 'material-palenight',
  })
  await highlighter.loadLanguage(pintoraLanguage)

  return { highlighter }
}

// start()

startShiki().then(({ highlighter }) => {
  const html = highlighter.codeToHtml(TEST_TEXT, { lang: 'pintora' })
  const resultDiv = document.createElement('div')
  resultDiv.id = 'result'
  resultDiv.innerHTML = html
  document.body.appendChild(resultDiv)
})
