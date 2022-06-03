import * as pintora from '@pintora/core'
import { EXAMPLES } from '@pintora/test-shared'
import { testDraw, findMarkInGraphicsIR, makeGraphicEvent } from '../../__tests__/test-util'
import { sequenceDiagram } from '../index'
import { eventRecognizer } from '../event-recognizer'
import { LINETYPE, SequenceDiagramIR } from '../db'

describe('sequence event recognizer', () => {
  beforeAll(() => {
    pintora.diagramRegistry.registerDiagram('sequenceDiagram', sequenceDiagram)
  })

  it('can recognize actor', () => {
    const result = testDraw(EXAMPLES.sequence.code)
    const diagramIR = result.diagramIR as SequenceDiagramIR
    const secondActor = diagramIR.actors[Object.keys(diagramIR.actors)[1]]
    const entityMark = findMarkInGraphicsIR(result.graphicIR, mark => mark.itemId === secondActor.itemId)
    const e = makeGraphicEvent('mouseenter', entityMark)
    const diagramEvent = eventRecognizer.recognize(e, diagramIR)
    if (diagramEvent) {
      expect(diagramEvent).toMatchObject({
        type: 'mouseenter',
        item: {
          diagram: 'sequence',
          type: 'actor',
        },
      })
      expect(diagramEvent.item.data === secondActor).toBeTruthy()
    }
  })

  it('can recognize message', () => {
    const result = testDraw(EXAMPLES.sequence.code)
    const diagramIR = result.diagramIR as SequenceDiagramIR
    const message = diagramIR.messages.find(m => m.type === LINETYPE.DOTTED)
    const resultMark = findMarkInGraphicsIR(result.graphicIR, mark => mark.itemId === message.itemId)
    const e = makeGraphicEvent('mouseenter', resultMark)
    const diagramEvent = eventRecognizer.recognize(e, diagramIR)
    if (diagramEvent) {
      expect(diagramEvent).toMatchObject({
        type: 'mouseenter',
        item: {
          diagram: 'sequence',
          type: 'message',
        },
      })
      expect(diagramEvent.item.data === message).toBeTruthy()
    }
  })
})
