/**
 * pintora target for wintercg, this module will be bundled into one file. It will be combined with other handler code runs inside edge runtime
 */
import { pintoraStandalone } from '@pintora/standalone'
import { doRender, RuntimeRenderOptions } from './render'
import './text-metric'

export async function render(opts: RuntimeRenderOptions) {
  const svg = await doRender({
    ...opts,
    code: opts.code,
  })
  // console.log('svg output', svg)
  const pintoraOutput = {
    type: 'svg',
    data: svg,
  }
  return pintoraOutput
}

export default pintoraStandalone
