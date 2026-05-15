import { diagramRegistry } from '@pintora/core'
import { getConf } from '../config'
import db from '../db'
import { c4Diagram } from '../index'
import { parse } from '../parser'

describe('c4 config and registration', () => {
  afterEach(() => {
    db.clear()
  })

  it('uses top-to-bottom layout by default', () => {
    parse(`
C4Container
Person(customer, "Customer")
System_Ext(email, "E-mail System")
`)

    const conf = getConf(db.getDiagramIR())

    expect(conf.layoutDirection).toBe('TB')
  })

  it('can parse param and override config clauses', () => {
    parse(`
C4Context
@param personBackground #000000
@param {
  elementPadding 20
  fontFamily serif
}
@config({
  "c4": {
    "layoutDirection": "LR",
    "lineWidth": 3
  }
})
Person(customer, "Customer")
System(api, "API")
Rel(customer, api, "Uses")
`)

    const conf = getConf(db.getDiagramIR())

    expect(conf).toMatchObject({
      personBackground: '#000000',
      elementPadding: 20,
      fontFamily: 'serif',
      layoutDirection: 'LR',
      lineWidth: 3,
    })
  })

  it('detects C4 macro entry points through the diagram registry', () => {
    diagramRegistry.registerDiagram('c4Diagram', c4Diagram)

    expect(diagramRegistry.detectDiagram('C4Context\nPerson(customer, "Customer")')).toBe(c4Diagram)
    expect(diagramRegistry.detectDiagram('C4Container\nPerson(customer, "Customer")')).toBe(c4Diagram)
    expect(diagramRegistry.detectDiagram('C4Component\nPerson(customer, "Customer")')).toBe(c4Diagram)
    expect(diagramRegistry.detectDiagram('c4Diagram\nPerson(customer, "Customer")')).toBe(c4Diagram)
  })
})
