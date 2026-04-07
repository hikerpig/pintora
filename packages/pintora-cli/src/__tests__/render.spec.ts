import { pintoraStandalone } from '@pintora/standalone'
import { EXAMPLES } from '@pintora/test-shared'
import { SVG_MIME_TYPE } from '../const'
import { render } from '../render'
import { renderToImage, renderToSvg } from '../index'

describe('render', () => {
  it('can output svg', async () => {
    const svgString = await render({
      code: EXAMPLES.er.code,
      mimeType: SVG_MIME_TYPE,
    })
    expect(svgString.length).toBeGreaterThan(20)
  })

  it('exposes a programmatic svg renderer without requiring callers to pass a mime type', async () => {
    const svgString = await renderToSvg({
      code: EXAMPLES.er.code,
      renderInSubprocess: false,
    })

    expect(svgString).toContain('<svg')
  })

  it('exposes a programmatic image renderer that defaults to png output', async () => {
    const buf = await renderToImage({
      code: EXAMPLES.er.code,
      renderInSubprocess: false,
    })

    expect(buf.constructor).toBe(Buffer)
    expect(buf.length).toBeGreaterThan(0)
  })

  it('can output jpeg', async () => {
    const buf = await render({
      code: EXAMPLES.er.code,
      mimeType: 'image/jpeg',
    })
    expect(buf.constructor).toBe(Buffer)
    expect(buf.length).toBeGreaterThan(0)
  })

  it('pintoraConfig should not alter global config', async () => {
    const oldTheme = pintoraStandalone.configApi.getConfig().themeConfig.theme
    const oldUseMaxWidth = pintoraStandalone.configApi.getConfig().core?.useMaxWidth
    await render({
      code: EXAMPLES.er.code,
      width: 1000,
      pintoraConfig: {
        themeConfig: {
          theme: 'light',
        },
      },
    })

    const config = pintoraStandalone.configApi.getConfig()
    expect(config.themeConfig.theme).toBe(oldTheme)
    expect(config.core.useMaxWidth).toBe(oldUseMaxWidth)
  })

  it('should cleanup global pollution after render', async () => {
    const fakeDom = {}
    ;(globalThis as any).document = fakeDom

    await render({
      code: EXAMPLES.er.code,
      mimeType: SVG_MIME_TYPE,
    })
    expect(global.window).toBeUndefined()
    expect((globalThis as any).document).toBe(fakeDom) // should not mess with existing globals

    delete (globalThis as any).document
  })
})
