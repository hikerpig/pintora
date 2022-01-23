import { parse } from '../parser'
import db from '../db'
import { getConf } from '../config'

describe('er config', () => {
  afterEach(() => {
    db.clear()
  })
  it('can parse style clause', () => {
    const example = `
erDiagram
  @config fill #aabb00
  @config fontSize 16
  ORDER
    `
    parse(example)
    const ir = db.getDiagramIR()
    const conf = getConf(ir.configParams)
    // console.log('ir', JSON.stringify(ir, null, 2))
    // console.log(conf)
    expect(conf).toMatchObject({
      fill: '#aabb00',
      fontSize: 16,
    })
  })
})
