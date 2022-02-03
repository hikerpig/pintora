import { parse } from '../parser'
import db from '../db'
import { getConf } from '../config'

describe('componentDiagram config', () => {
  afterEach(() => {
    db.clear()
  })

  it('can parse config', () => {
    const example = `
  componentDiagram
  @config groupBackground #000000
  @config {
    componentPadding 20
    fontFamily serif
  }
  package "P_A" {
    [ContentA]
  }
  `
    parse(example)
    const ir = db.getDiagramIR()
    const conf = getConf(ir.configParams)
    expect(conf).toMatchObject({
      groupBackground: '#000000',
      componentPadding: 20,
      fontFamily: 'serif',
    })
  })
})
