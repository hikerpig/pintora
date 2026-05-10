import { buildEntityBoxes } from '../ascii/entity-layout'
import type { ErDiagramIR } from '../db'

describe('buildEntityBoxes', () => {
  it('sizes boxes from entity names and formatted attributes', () => {
    const ir: ErDiagramIR = {
      title: '',
      configParams: [],
      overrideConfig: {},
      entities: {
        ORDER: {
          name: 'ORDER',
          attributes: [
            { attributeType: 'int', attributeName: 'order_number', attributeKey: 'PK' },
            { attributeType: 'string', attributeName: 'adress', comment: 'delivery address' },
          ],
        },
      },
      relationships: [],
      inheritances: [],
    }

    const boxes = buildEntityBoxes(ir)

    expect(boxes).toHaveLength(1)
    expect(boxes[0]).toMatchObject({
      id: 'ORDER',
      width: expect.any(Number),
      height: 6,
      attributes: [{ text: 'PK int order_number' }, { text: 'string adress "delivery address"' }],
    })
    expect(boxes[0].width).toBeGreaterThan('string adress "delivery address"'.length)
  })
})
