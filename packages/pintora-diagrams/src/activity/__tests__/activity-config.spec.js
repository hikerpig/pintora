//@ts-check
import { parse } from '../parser'
import { db } from '../db'
import { getConf } from '../config'

describe('activityDiagram config', () => {
  afterEach(() => {
    db.clear()
  })

  it('can parse  param clause', () => {
    const example = `
activityDiagram
  @param {
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
    const conf = getConf(ir)
    expect(conf).toMatchObject({
      noteTextColor: '#ff0000',
      noteMargin: 15,
    })
  })

  it('can parse override clause', () => {
    const example = `
activityDiagram
  @config({
    "activity": {
      "edgesep": 4,
      "edgeColor": "rgba(0, 0, 0, 1)",
      "curvedEdge": true
    }
  })
    `
    parse(example)
    const ir = db.getDiagramIR()
    const conf = getConf(ir)
    expect(conf).toMatchObject({
      edgesep: 4,
      edgeColor: 'rgba(0, 0, 0, 1)',
      curvedEdge: true,
    })
  })
})
