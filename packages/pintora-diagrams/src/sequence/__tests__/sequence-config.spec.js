//@ts-check
import { stripStartEmptyLines } from '@pintora/test-shared'
import { parse } from '../parser'
import { db } from '../db'
import { getConf } from '../config'

describe('er config', () => {
  afterEach(() => {
    db.clear()
  })

  it('can parse param clause', () => {
    const example = stripStartEmptyLines(`
sequenceDiagram
  @param noteTextColor #00bbaa
  @param messageFontSize 20
  `)
    parse(example)
    const ir = db.getDiagramIR()
    // console.log(JSON.stringify(ir, null, 2))
    expect(ir.configParams).toMatchObject([
      {
        key: 'noteTextColor',
        value: '#00bbaa',
      },
      {
        key: 'messageFontSize',
        value: '20',
      },
    ])
  })

  it('can parse param clause inside brackets', () => {
    const example = stripStartEmptyLines(`
sequenceDiagram
  @param {
    noteTextColor #00bbaa
    messageFontSize 20
  }
  `)
    parse(example)
    const ir = db.getDiagramIR()
    expect(ir.configParams).toMatchObject([
      {
        key: 'noteTextColor',
        value: '#00bbaa',
      },
      {
        key: 'messageFontSize',
        value: '20',
      },
    ])
  })

  it('can parse override clause', () => {
    const example = `
sequenceDiagram
  @config({
    "sequence": {
      "actorWidth": 4
    }
  })
    `
    parse(example)
    const ir = db.getDiagramIR()
    const conf = getConf(ir)
    // console.log('ir', JSON.stringify(ir, null, 2))
    expect(conf).toMatchObject({
      actorWidth: 4,
    })
  })
})
