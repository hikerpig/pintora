import { EdgeRuntime, runServer } from 'edge-runtime'
import { onExit } from 'signal-exit'
import * as fs from 'fs'
import * as path from 'path'

const dir = __dirname

async function main() {
  const runtimeCode = fs.readFileSync(path.join(dir, '../dist/runtime.js'), 'utf-8').toString()
  const handlerCode = fs.readFileSync(path.join(dir, './snippets/edge-server-handler.js'), 'utf-8').toString()
  const initialCode = `
  ${runtimeCode}
  // separation
  ${handlerCode}
  `

  const edgeRuntime = new EdgeRuntime({ initialCode })

  const server = await runServer({ runtime: edgeRuntime, port: 9000 })
  console.log(`> Edge server running at ${server.url}`)
  onExit(() => {
    server.close()
    return
  })
}

main()
