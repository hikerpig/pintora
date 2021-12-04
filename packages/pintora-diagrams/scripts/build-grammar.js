const shellExec = require('shell-exec')
const path = require('path')

const grammarFiles = [
  { input: 'src/er/parser/erDiagram.ne', output: 'src/er/parser/erDiagram.ts' },
  { input: 'src/sequence/parser/sequenceDiagram.ne', output: 'src/sequence/parser/sequenceDiagram.ts' },
  { input: 'src/component/parser/componentDiagram.ne', output: 'src/component/parser/componentDiagram.ts' },
  { input: 'src/activity/parser/activityDiagram.ne', output: 'src/activity/parser/activityDiagram.ts' },
]

grammarFiles.forEach(({ input, output }) => {
  shellExec(`npx nearleyc ${path.join(__dirname, '..', input)} -o ${path.join(__dirname, '..', output)}`)
    .then(console.log)
    .catch(console.error)
})
