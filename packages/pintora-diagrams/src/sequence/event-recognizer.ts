import { diagramEventMakerFactory } from '@pintora/core'
import { BaseEventRecognizer } from '../util/event-recognizer'
import { Actor, Message, SequenceDiagramIR } from './db'

const ACTOR_ITEM_PATTERN = /^actor\-/
const MESSAGE_ITEM_PATTERN = /^message\-/

export type SequenceDiagramItemDatas = {
  actor: Actor
  message: Message
}

const createSequenceDiagramEvent = diagramEventMakerFactory('sequence')

export const eventRecognizer = new BaseEventRecognizer<SequenceDiagramIR>()
  .addPatternRecognizerRule(ACTOR_ITEM_PATTERN, (e, m, ir) => {
    const actor = ir.actors[m.itemId.replace(ACTOR_ITEM_PATTERN, '')]
    return createSequenceDiagramEvent(e, m, m.itemId, 'actor', actor)
  })
  .addPatternRecognizerRule(MESSAGE_ITEM_PATTERN, (e, m, ir) => {
    const message = ir.messages.find(m => m.itemId === m.itemId)
    return createSequenceDiagramEvent(e, m, m.itemId, 'message', message)
  })
