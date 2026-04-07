import { renderToSvg } from '@pintora/cli'
import type { PintoraConfig, DeepPartial } from '@pintora/standalone'

type HarnessRenderSvgOptions = {
  code: string
  backgroundColor?: string
  pintoraConfig?: DeepPartial<PintoraConfig>
  width?: number
}

export async function renderHarnessSvg(opts: HarnessRenderSvgOptions) {
  return renderToSvg({
    ...opts,
    renderInSubprocess: false,
  })
}
