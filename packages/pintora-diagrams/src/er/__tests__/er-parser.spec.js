import { parse } from '../parser'
import db from '../db'
import { stripStartEmptyLines } from '@pintora/test-shared'

describe('er parser', () => {
  afterEach(() => {
    db.clear()
  })

  it('will parse message inside quotes', () => {
    const example = stripStartEmptyLines(`
erDiagram
  artists {
    INTEGER ArtistId
    NVARCHAR Name
  }
  albums

  artists ||--o{ albums : "foreign key"
    `)
    parse(example)
    const ir = db.getDiagramIR()
    expect(ir.entities['artists']).toBeTruthy()
  })

  it('will parse attribute key', () => {
    const example = `erDiagram
    ORDER {
      int orderNumber PK
      string deliveryAddress
    }
    `
    parse(example)
    const ir = db.getDiagramIR()
    // console.log(JSON.stringify(ir, null, 2))
    expect(ir.entities).toMatchObject({
      ORDER: {
        attributes: [
          {
            attributeType: 'int',
            attributeName: 'orderNumber',
            attributeKey: 'PK',
          },
          {
            attributeType: 'string',
            attributeName: 'deliveryAddress',
          },
        ],
      },
    })
  })

  it('can parse comments', () => {
    parse(
      stripStartEmptyLines(`
erDiagram
  %% comment here
  `),
    )
    const ir = db.getDiagramIR()
    expect(Object.keys(ir.entities).length).toBe(0)
  })
})
