import { runInThisContext } from 'vm'
import * as fs from 'fs'
import * as path from 'path'
import type { PintoraTarget } from '../types'

const dir = __dirname

async function main() {
  const runtimeCode = fs.readFileSync(path.join(dir, '../dist/runtime.iife.js'), 'utf-8').toString()
  const codeToRun = runtimeCode

  if (process.env.DEBUG_CODE === 'true') {
    fs.writeFileSync(path.join(process.cwd(), 'dist/code-to-run.js'), codeToRun)
  }
  await runInThisContext(codeToRun)
  const target = (globalThis as any).pintoraTarget as PintoraTarget
  let pintoraDsl = ''
  const inputFilePath = process.argv[2]
  if (inputFilePath) {
    pintoraDsl = fs.readFileSync(inputFilePath, 'utf-8').toString()
  }
  // console.log('code is', pintoraDsl)
  const output = await target.render({
    code: pintoraDsl,
  })
  fs.writeFileSync('test.svg', output.data)
}

main()
