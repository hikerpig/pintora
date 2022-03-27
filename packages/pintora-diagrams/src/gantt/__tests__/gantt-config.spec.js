//@ts-check
import { parse } from '../parser'
import db from '../db'
import { getConf } from '../config'

describe('gantt config', () => {
  afterEach(() => {
    db.clear()
  })
  it('can parse param clause', () => {
    const example = `
gantt
  @param sidePadding 16
  @param {
    markLineColor #990000
  }
  title "gantt param"
    `
    parse(example)
    const ir = db.getDiagramIR()
    const conf = getConf(ir)
    expect(conf).toMatchObject({
      sidePadding: 16,
      markLineColor: '#990000',
    })
  })

  it('can parse override clause', () => {
    const example = `
gantt
  @config({
    "gantt": {
      "sectionBackgrounds": ["#ff0000", null]
    }
  })
  title gantt config
    `
    parse(example)
    const ir = db.getDiagramIR()
    const conf = getConf(ir)
    expect(conf).toMatchObject({
      sectionBackgrounds: ['#ff0000', null],
    })
  })
})
