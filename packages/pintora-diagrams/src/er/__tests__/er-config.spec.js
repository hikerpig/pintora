//@ts-check
import { parse } from '../parser'
import db from '../db'
import { getConf } from '../config'

describe('er config', () => {
  afterEach(() => {
    db.clear()
  })
  it('can parse param clause', () => {
    const example = `
erDiagram
  @param fill #aabb00
  @param fontSize 16
  @param {
    layoutDirection LR
  }
  ORDER
    `
    parse(example)
    const ir = db.getDiagramIR()
    const conf = getConf(ir)
    // console.log('ir', JSON.stringify(ir, null, 2))
    // console.log(conf)
    expect(conf).toMatchObject({
      fill: '#aabb00',
      fontSize: 16,
    })
  })

  it('can parse override clause', () => {
    const example = `
erDiagram
  @config({
    "er": {
      "borderRadius": 4
    }
  })
  ORDER
    `
    parse(example)
    const ir = db.getDiagramIR()
    const conf = getConf(ir)
    // console.log('ir', JSON.stringify(ir, null, 2))
    expect(conf).toMatchObject({
      borderRadius: 4,
    })
  })
})
