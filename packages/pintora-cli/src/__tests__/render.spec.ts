import { SVG_MIME_TYPE } from '../const'
import { render } from '../render'
import { EXAMPLES } from '@pintora/test-shared'

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
})
