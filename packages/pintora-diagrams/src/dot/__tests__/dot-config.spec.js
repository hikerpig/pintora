//@ts-check
import { parse } from '../parser'
import db from '../db'
import { getConf } from '../config'

describe('dot config', () => {
  afterEach(() => {
    db.clear()
  })
  it('can parse param clause', () => {
    const example = `
dotDiagram
  @param nodePadding 16
  @param {
    layoutDirection LR
  }
    `
    parse(example)
    const ir = db.getDiagramIR()
    const conf = getConf(ir)
    expect(conf).toMatchObject({
      nodePadding: 16,
      layoutDirection: 'LR',
    })
  })

  it('can parse override clause', () => {
    const example = `
dotDiagram
  @config({
    "dot": {
      "edgeColor": "#111"
    }
  })
    `
    parse(example)
    const ir = db.getDiagramIR()
    const conf = getConf(ir)
    expect(conf).toMatchObject({
      edgeColor: '#111',
    })
  })
})
