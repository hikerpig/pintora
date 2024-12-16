/* eslint-disable @typescript-eslint/no-var-requires */
const path = require('path')
const { compileGrammar } = require('@pintora/development-kit')

const grammarFiles = [
  { input: 'src/util/preproccesor/parser/preproccesor.ne', output: 'src/util/preproccesor/parser/preproccesor.ts' },
  { input: 'src/util/style-engine/grammar/style-test.ne', output: 'src/util/style-engine/grammar/style-test.ts' },
  // { input: 'src/er/parser/erDiagram.ne', output: 'src/er/parser/erDiagram.ts' },
  // { input: 'src/sequence/parser/sequenceDiagram.ne', output: 'src/sequence/parser/sequenceDiagram.ts' },
  // { input: 'src/component/parser/componentDiagram.ne', output: 'src/component/parser/componentDiagram.ts' },
  // { input: 'src/activity/parser/activityDiagram.ne', output: 'src/activity/parser/activityDiagram.ts' },
  // { input: 'src/mindmap/parser/mindmap.ne', output: 'src/mindmap/parser/mindmap.ts' },
  // { input: 'src/gantt/parser/gantt.ne', output: 'src/gantt/parser/gantt.ts' },
  // { input: 'src/dot/parser/dotDiagram.ne', output: 'src/dot/parser/dotDiagram.ts' },
  // { input: 'src/class/parser/classDiagram.ne', output: 'src/class/parser/classDiagram.ts' },
]

grammarFiles.forEach(async ({ input, output }) => {
  const packagePath = path.join(__dirname, '..')
  const outputPath = path.join(__dirname, '..', output)
  const includePath = path.join(packagePath, 'shared-grammars/')
  compileGrammar({
    input,
    output: outputPath,
    includePaths: [includePath],
    basePath: packagePath,
    executeCommand: 'pnpm exec',
  })
})
