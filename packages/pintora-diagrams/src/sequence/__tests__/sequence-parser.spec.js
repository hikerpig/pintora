import { parse } from '../parser'
import { db } from '../db'

describe('sequence parser', () => {
  afterEach(() => {
    db.clear()
  })

  const example = `sequenceDiagram
  User->>+Pintora: render this
  activate Pintora
  loop Check input
    Pintora-->>Pintora: Has input changed?
  end
  `
  it('just works', () => {
    parse(example)
    console.log(db.getDiagramIR())
  })
})
