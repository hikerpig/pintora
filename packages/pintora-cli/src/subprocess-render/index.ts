import { fork } from 'node:child_process'

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
            resolve(message.data.data)
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
