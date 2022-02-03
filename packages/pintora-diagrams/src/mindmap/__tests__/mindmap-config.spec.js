import { parse } from '../parser'
import db from '../db'
import { getConf } from '../config'

describe('mindmap config', () => {
  afterEach(() => {
    db.clear()
  })

  it('can parse config', () => {
    const example = `
  mindmap
  @config maxFontSize 16
  @config {
    l1NodeBgColor #555555
    l2NodeBgColor red
  }
  * Level
  `
    parse(example)
    const ir = db.getDiagramIR()
    const conf = getConf(ir.configParams)
    expect(conf).toMatchObject({
      maxFontSize: 16,
      l1NodeBgColor: '#555555',
      l2NodeBgColor: 'red',
    })
  })
})
