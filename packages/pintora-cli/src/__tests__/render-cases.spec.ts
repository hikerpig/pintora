import { stripStartEmptyLines } from '@pintora/test-shared'
import { PNG_MIME_TYPE } from '../const'
import { render } from '../render'

describe('render cases', () => {
  // #147
  it('will not throw CanvasPattern ReferenceError', async () => {
    const code = stripStartEmptyLines(`
  sequenceDiagram
    alt ffffff I am the label
      a --> b : text
    end
  `)

    const svgString = await render({
      code,
      mimeType: PNG_MIME_TYPE,
    })

    // console.log(svgString)
  })
})
