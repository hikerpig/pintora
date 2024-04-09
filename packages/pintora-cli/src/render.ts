import type { CLIRenderOptions } from './render-impl'
import { renderInCurrentProcess } from './sameprocess-render'
import { renderInSubprocess } from './subprocess-render'
import { render as renderImpl } from './render-impl'

const shouldEnableRenderInSubprocess = typeof jest === 'undefined'

export async function render(opts: CLIRenderOptions): Promise<ReturnType<typeof renderImpl>> {
  if (typeof opts.renderInSubprocess === 'undefined') {
    opts.renderInSubprocess = shouldEnableRenderInSubprocess
  }
  if (opts.renderInSubprocess) {
    return renderInSubprocess(opts) as any
  } else {
    return renderInCurrentProcess(opts)
  }
}
