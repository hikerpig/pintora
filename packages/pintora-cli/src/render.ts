import type { CLIRenderOptions } from './render-impl'
import { renderInCurrentProcess } from './sameprocess-render'
import { renderInSubprocess } from './subprocess-render'
import { render as renderImpl } from './render-impl'
import { PNG_MIME_TYPE, SVG_MIME_TYPE } from './const'

const shouldEnableRenderInSubprocess = typeof jest === 'undefined'

export type RenderToSvgOptions = Omit<CLIRenderOptions, 'mimeType'>

export type RenderToImageOptions = Omit<CLIRenderOptions, 'mimeType'> & {
  mimeType?: typeof PNG_MIME_TYPE | 'image/jpeg'
}

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

export async function renderToSvg(opts: RenderToSvgOptions): Promise<string> {
  const output = await render({
    ...opts,
    mimeType: SVG_MIME_TYPE,
  })
  return output as string
}

export async function renderToImage(opts: RenderToImageOptions): Promise<Buffer> {
  const output = await render({
    ...opts,
    mimeType: opts.mimeType || PNG_MIME_TYPE,
  })
  return output as Buffer
}
