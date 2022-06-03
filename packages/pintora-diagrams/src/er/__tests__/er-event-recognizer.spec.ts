import { diagramRegistry, Mark } from '@pintora/core'
import { EXAMPLES } from '@pintora/test-shared'
import { testDraw, traverseGraphicsIR, makeGraphicEvent } from '../../__tests__/test-util'
import { erDiagram } from '../index'
import { eventRecognizer } from '../event-recognizer'
import { ErDiagramIR } from '../db'

describe('er event recognizer', () => {
  beforeAll(() => {
    diagramRegistry.registerDiagram('erDiagram', erDiagram)
  })

  it('can recognize entity', () => {
    const result = testDraw(EXAMPLES.erLarge.code)
    const diagramIR = result.diagramIR as ErDiagramIR
    const firstEntity = diagramIR.entities[Object.keys(diagramIR.entities)[0]]
    let entityMark: Mark
    traverseGraphicsIR(result.graphicIR, (mark, acitons) => {
      if (mark.itemId === firstEntity.itemId) {
        entityMark = mark
        acitons.stop()
      }
    })
    const e = makeGraphicEvent('click', entityMark)
    const diagramEvent = eventRecognizer.recognize(e, diagramIR)
    if (diagramEvent) {
      expect(diagramEvent).toMatchObject({
        type: 'click',
        item: {
          diagram: 'er',
          type: 'entity',
        },
      })
      expect(diagramEvent.item.data === firstEntity).toBeTruthy()
    }
  })

  it('can recognize relationship', () => {
    const result = testDraw(EXAMPLES.erLarge.code)
    const diagramIR = result.diagramIR as ErDiagramIR
    const firstRelationship = diagramIR.relationships[0]
    let matchedMark: Mark
    traverseGraphicsIR(result.graphicIR, (mark, acitons) => {
      if (mark.itemId === firstRelationship.itemId) {
        matchedMark = mark
        acitons.stop()
      }
    })
    const e = makeGraphicEvent('click', matchedMark)
    const diagramEvent = eventRecognizer.recognize(e, diagramIR)
    if (diagramEvent) {
      expect(diagramEvent).toMatchObject({
        type: 'click',
        item: {
          diagram: 'er',
          type: 'relationship',
        },
      })
      expect(diagramEvent.item.data === firstRelationship).toBeTruthy()
    }
  })
})
