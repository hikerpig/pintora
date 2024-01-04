// test edge runtime
// node out-scripts/edge-runtime-server.js
import { EdgeRuntime } from 'edge-runtime'
import * as fs from 'fs'
import * as path from 'path'
import type { PintoraTarget } from '../types'

const runtime = new EdgeRuntime()

const dir = __dirname
async function main() {
  const runtimeCode = fs.readFileSync(path.join(dir, '../dist/runtime.iife.js'), 'utf-8').toString()

  const codeToRun = `
${runtimeCode}
`
  await runtime.evaluate(codeToRun)
  // console.log('runtime context', runtime.context)
  const target: PintoraTarget = runtime.context.pintoraTarget

  let pintoraDsl = ''
  const inputFilePath = process.argv[2]
  if (inputFilePath) {
    pintoraDsl = fs.readFileSync(inputFilePath, 'utf-8').toString()
  }
  const output = await target.render({
    code: pintoraDsl,
  })
  fs.writeFileSync('test.svg', output.data)
}

main()
