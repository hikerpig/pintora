import { fork } from 'node:child_process'
import { Buffer } from 'node:buffer'

import type { CLIRenderOptions } from '../render-impl'
import path from 'node:path'
import type { SubprocessSentMessage } from './render-in-subprocess'

export async function renderInSubprocess(opts: CLIRenderOptions) {
  return new Promise((resolve, reject) => {
    const subprocess = fork(path.join(__dirname, 'render-in-subprocess'), {
      stdio: 'inherit',
    })
    subprocess.on('message', (message: SubprocessSentMessage) => {
      switch (message.type) {
        case 'success': {
          if (typeof message.data === 'string') {
            resolve(message.data)
          } else {
            resolve(Buffer.from(message.data.data))
          }
          subprocess.kill()
          break
        }
        case 'error': {
          reject()
          break
        }
      }
    })
    subprocess.send({
      type: 'start',
      opts,
    })
  })
}
