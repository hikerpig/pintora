import { parse } from '../parser'
import { db } from '../db'
import { stripStartEmptyLines } from '@pintora/test-shared'

describe('sequence parser', () => {
  afterEach(() => {
    db.clear()
  })

  it('can parse singleline note', () => {
    const backquoteExample = `sequenceDiagram
    @note right of User: singleline note
    `
    parse(backquoteExample)
    const result = db.getDiagramIR()
    // console.log('notes', result.notes)
    expect(result.notes.length).toEqual(1)
    expect(result.notes[0]).toMatchObject({
      text: 'singleline note',
    })
  })

  it('can parse multiline note', () => {
    const multilineNoteExample = stripStartEmptyLines(`
sequenceDiagram
  @note right of Pintora
  aaa note
  bbb
  @end_note
    `)
    parse(multilineNoteExample)
    const result = db.getDiagramIR()
    // console.log('notes', result.notes)
    expect(result.notes.length).toEqual(1)
    // parseMessage will trim text, so this may be somehow strange
    expect(result.notes[0]).toMatchObject({
      text: 'aaa note\n  bbb',
    })
  })

})
