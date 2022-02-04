//@ts-check
import { parse } from '../parser'
import db from '../db'
import { getConf } from '../config'

describe('componentDiagram config', () => {
  afterEach(() => {
    db.clear()
  })

  it('can parse  param clause', () => {
    const example = `
  componentDiagram
  @param groupBackground #000000
  @param {
    componentPadding 20
    fontFamily serif
  }
  package "P_A" {
    [ContentA]
  }
  `
    parse(example)
    const ir = db.getDiagramIR()
    const conf = getConf(ir)
    expect(conf).toMatchObject({
      groupBackground: '#000000',
      componentPadding: 20,
      fontFamily: 'serif',
    })
  })

  it('can parse override clause', () => {
    const example = `
componentDiagram
  @config({
    "component": {
      "componentPadding": 4,
      "textColor": "rgba(0, 0, 0, 1)"
    }
  })
    `
    parse(example)
    const ir = db.getDiagramIR()
    const conf = getConf(ir)
    expect(conf).toMatchObject({
      componentPadding: 4,
      textColor: 'rgba(0, 0, 0, 1)',
    })
  })
})
