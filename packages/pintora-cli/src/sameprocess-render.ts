import type { CLIRenderOptions } from './render-impl'
import { render as renderImpl } from './render-impl'

export function renderInCurrentProcess(opts: CLIRenderOptions) {
  return renderImpl(opts)
}
