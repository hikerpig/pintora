//@ts-check
import { parse } from '../parser'
import db from '../db'
import { getConf } from '../config'

describe('mindmap config', () => {
  afterEach(() => {
    db.clear()
  })

  it('can parse  param clause', () => {
    const example = `
  mindmap
  @param maxFontSize 16
  @param {
    l1NodeBgColor #555555
    l2NodeBgColor red
  }
  * Level
  `
    parse(example)
    const ir = db.getDiagramIR()
    const conf = getConf(ir)
    expect(conf).toMatchObject({
      maxFontSize: 16,
      l1NodeBgColor: '#555555',
      l2NodeBgColor: 'red',
    })
  })

  it('can parse override clause', () => {
    const example = `
  mindmap
  @config({
    "mindmap": {
      "nodeBgColor": "#ff0000"
    }
  })
    `
    parse(example)
    const ir = db.getDiagramIR()
    const conf = getConf(ir)
    expect(conf).toMatchObject({
      nodeBgColor: '#ff0000',
    })
  })
})
