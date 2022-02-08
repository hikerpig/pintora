// const shellExec = require('shell-exec')
const path = require('path')
// const fs = require('fs')
const { compileGrammar } = require('../dev-helper')

const grammarFiles = [
  { input: 'src/er/parser/erDiagram.ne', output: 'src/er/parser/erDiagram.ts' },
  { input: 'src/sequence/parser/sequenceDiagram.ne', output: 'src/sequence/parser/sequenceDiagram.ts' },
  { input: 'src/component/parser/componentDiagram.ne', output: 'src/component/parser/componentDiagram.ts' },
  { input: 'src/activity/parser/activityDiagram.ne', output: 'src/activity/parser/activityDiagram.ts' },
  { input: 'src/mindmap/parser/mindmap.ne', output: 'src/mindmap/parser/mindmap.ts' },
]

grammarFiles.forEach(async ({ input, output }) => {
  const outputPath = path.join(__dirname, '..', output)
  compileGrammar({ input, output: outputPath })
})
