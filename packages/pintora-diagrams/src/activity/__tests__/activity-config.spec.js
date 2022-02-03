import { parse } from '../parser'
import { db } from '../db'
import { getConf } from '../config'

describe('activityDiagram config', () => {
  afterEach(() => {
    db.clear()
  })

  it('can parse config', () => {
    const example = `
activityDiagram
  @config {
    noteTextColor #ff0000
    noteMargin 15
  }
  group Init {
    if (diagram registered ?) then
      :get implementation;
    else (no)
      :print error;
    endif
  }
  `
    parse(example)
    const ir = db.getDiagramIR()
    const conf = getConf(ir.configParams)
    expect(conf).toMatchObject({
      noteTextColor: '#ff0000',
      noteMargin: 15,
    })
  })
})
