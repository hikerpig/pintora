const shellExec = require('shell-exec')
const path = require('path')

const grammarFiles = [{ input: 'src/er/parser/erDiagram.ne', output: 'src/er/parser/erDiagram.ts' }]

grammarFiles.forEach(({ input, output }) => {
  shellExec(`npx nearleyc ${path.join(__dirname, '..', input)} -o ${path.join(__dirname, '..', output)}`)
    .then(console.log)
    .catch(console.error)
})
