/* eslint-disable @typescript-eslint/no-var-requires */
const path = require('path')
const { compileGrammar } = require('@pintora/development-kit')

const grammarFiles = [
  { input: 'src/er/parser/erDiagram.ne', output: 'src/er/parser/erDiagram.ts' },
  { input: 'src/sequence/parser/sequenceDiagram.ne', output: 'src/sequence/parser/sequenceDiagram.ts' },
  { input: 'src/component/parser/componentDiagram.ne', output: 'src/component/parser/componentDiagram.ts' },
  { input: 'src/activity/parser/activityDiagram.ne', output: 'src/activity/parser/activityDiagram.ts' },
  { input: 'src/mindmap/parser/mindmap.ne', output: 'src/mindmap/parser/mindmap.ts' },
  { input: 'src/gantt/parser/gantt.ne', output: 'src/gantt/parser/gantt.ts' },
]

grammarFiles.forEach(async ({ input, output }) => {
  const packagePath = path.join(__dirname, '..')
  const outputPath = path.join(__dirname, '..', output)
  const includePath = path.join(packagePath, 'src/util/parser-grammars/')
  compileGrammar({ input, output: outputPath, includePaths: [includePath], basePath: packagePath })
})
