import * as monaco from 'monaco-editor'

monaco.languages.register({ id: 'pintora' })

monaco.languages.setMonarchTokensProvider('pintora', {
  unicode: true,
  keywords: ['sequenceDiagram', 'autonumber', 'activate', 'deactivate', 'loop', 'alt', 'par', 'end'],
  tokenizer: {
    root: [
      [/[a-z_$][\w$]*/, { cases: {
      '@keywords': 'keyword',
      '@default': 'identifier' } }],
      [/^\s*sequenceDiagram/, { token: 'keyword' }],
      [/\u{0040}note/, { token: 'keyword' }],
      [/\u{0040}end_note/, { token: 'keyword' }],
      [/--?>>?/, { token: 'tag' }],
      [/--x/, { token: 'tag' }],
      [/:\s(.*)/, { token: 'string' }],
    ]
  }
})
