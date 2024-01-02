/**
 * pintora target for wintercg, this module will be bundled into one file. It will be combined with other handler code runs inside edge runtime
 */
import { render, RuntimeRenderOptions } from './render'

async function pintoraMain(opts: RuntimeRenderOptions) {
  const svg = await render({
    ...opts,
    code:
      opts?.code ||
      `
      sequenceDiagram
      @param messageFontSize 24
      autonumber
      User->>Pintora: render this
    `,
  })
  // console.log('svg output', svg)
  const pintoraOutput = {
    type: 'svg',
    data: svg,
  }
  return pintoraOutput
}

// globalThis.pintoraMain = pintoraMain
export { pintoraMain }
