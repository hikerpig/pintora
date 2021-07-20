import { parse } from '../parser'
import db from '../db'
import { stripStartEmptyLines } from '@pintora/test-shared'

describe('er parser', () => {
  afterEach(() => {
    db.clear()
  })

  const example = `erDiagram
  CUSTOMER ||--o{ ORDER : places
  ORDER ||--|{ LINE-ITEM : contains
  CUSTOMER }|..|{ DELIVERY-ADDRESS : uses
  ORDER {
    string id
    Date date
}
  `
  it('just works', () => {
    parse(example)
    // console.log(db.getDiagramIR())
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
  artists ||--o{ albums : "foreign key"
    `)
    parse(example)
    const ir = db.getDiagramIR()
    expect(ir.entities['artists']).toBeTruthy()
  })
})
