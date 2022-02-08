/* eslint-disable @typescript-eslint/no-var-requires */
const shellExec = require('shell-exec')
const path = require('path')
const fs = require('fs')

// type Options = {
//   input: string
//   output: string
// }

exports.compileGrammar = async function (opts) {
  const { input, output } = opts
  const outputPath = output
  await shellExec(`npx nearleyc ${path.join(__dirname, '..', input)} -o ${outputPath}`)
    .then(console.log)
    .catch(console.error)

  if (fs.existsSync(outputPath)) {
    const content = fs.readFileSync(outputPath).toString()
    // the 'declare var' that nearleyc generates may raise TS2300 error 'Duplicate identifier', so we need to ignore it
    const newContent = content.replace(/declare\svar/g, '//@ts-ignore\ndeclare var')
    fs.writeFileSync(outputPath, newContent)
  }
}
