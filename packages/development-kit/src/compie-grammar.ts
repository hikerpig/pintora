import shellExec from 'shell-exec'
import * as path from 'path'
import * as fs from 'fs'

type Options = {
  input: string
  output: string
  basePath?: string
  includePaths?: string[]
  /**
   * - npx
   * - pnpx
   * - yarn run
   */
  executeCommand?: string
}

export async function compileGrammar(opts: Options) {
  const { input, output } = opts
  const basePath = opts.basePath || process.cwd()
  const outputPath = output
  const runCommand = opts.executeCommand || 'npx'
  let cmd = `${runCommand} nearleyc ${path.join(basePath, input)} -o ${outputPath}`
  if (opts.includePaths) {
    const includePaths = opts.includePaths || []
    cmd += ` --include-paths ${includePaths.join(',')}`
  }
  await shellExec(cmd).then(console.log).catch(console.error)

  if (fs.existsSync(outputPath)) {
    const content = fs.readFileSync(outputPath).toString()
    // the 'declare var' that nearleyc generates may raise TS2300 error 'Duplicate identifier', so we need to ignore it
    const newContent = content.replace(/declare\svar/g, '//@ts-ignore\ndeclare var')
    fs.writeFileSync(outputPath, newContent)
  }
}
