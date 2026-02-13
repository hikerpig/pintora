import { pintoraStandalone } from '@pintora/standalone'
import { EXAMPLES } from '@pintora/test-shared'
import { SVG_MIME_TYPE, TEXT_MIME_TYPE } from '../const'
import { render } from '../render'

describe('render', () => {
  it('can output svg', async () => {
    const svgString = await render({
      code: EXAMPLES.er.code,
      mimeType: SVG_MIME_TYPE,
    })
    expect(svgString.length).toBeGreaterThan(20)
  })

  it('can output jpeg', async () => {
    const buf = await render({
      code: EXAMPLES.er.code,
      mimeType: 'image/jpeg',
    })
    expect(buf.constructor).toBe(Buffer)
    expect(buf.length).toBeGreaterThan(0)
  })

  it('can output plain text with ascii renderer', async () => {
    const code = `
      sequenceDiagram
        participant 张三
        participant 李四
        张三->>李四: 你好
    `
    const text = await render({
      code,
      mimeType: TEXT_MIME_TYPE,
    })
    expect(typeof text).toBe('string')
    expect((text as string).length).toBeGreaterThan(0)
    const compact = (text as string).replace(/\s/g, '')
    expect(compact).toContain('张三')
    expect(compact).toContain('李四')
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

  it('should keep er attribute rows in correct absolute position for g v6', async () => {
    const code = `
erDiagram
  PERSON {
    string phone "phone number"
  }

  DELIVERER inherit PERSON
`.trim()

    const svgString = await render({
      code,
      mimeType: SVG_MIME_TYPE,
    })

    expect(svgString).toContain('>string</text>')
    expect(svgString).toContain('>PERSON</text>')
    expect(svgString).toContain('>DELIVERER</text>')
    expect(svgString).toContain('>ISA</text>')
  })
})
