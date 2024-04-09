import { render, type CLIRenderOptions } from '../render-impl'

export type MainProcessSentMessage = {
  type: 'start'
  opts: CLIRenderOptions
}

export type SubprocessSentMessage =
  | {
      type: 'success'
      data:
        | {
            type: 'buffer'
            data: Buffer
          }
        | string
    }
  | {
      type: 'error'
    }

process.on('message', (message: MainProcessSentMessage) => {
  if (message.type === 'start') {
    render(message.opts)
      .then(data => {
        process.send?.({
          type: 'success',
          data,
        })
      })
      .catch(error => {
        console.error('error', error)
        process.send?.({
          type: 'error',
        })
      })
  }
})
