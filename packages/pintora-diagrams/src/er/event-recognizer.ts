import { diagramEventMakerFactory } from '@pintora/core'
import { BaseEventRecognizer } from '../util/event-recognizer'
import { Entity, ErDiagramIR, Relationship } from './db'

const ENTITY_ITEM_PATTERN = /^entity\-/
const RELATIONSHIP_ITEM_PATTERN = /^relationship\-/

export type ErDiagramItemDatas = {
  entity: Entity
  relationship: Relationship
}

const createErDiagramEvent = diagramEventMakerFactory('er')

export const eventRecognizer = new BaseEventRecognizer<ErDiagramIR>()
  .addPatternRecognizerRule(ENTITY_ITEM_PATTERN, (e, m, ir) => {
    const entityName = m.itemId.replace(ENTITY_ITEM_PATTERN, '')
    return createErDiagramEvent(e, m, m.itemId, 'entity', ir.entities[entityName])
  })
  .addPatternRecognizerRule(RELATIONSHIP_ITEM_PATTERN, (e, m, ir) => {
    const data = ir.relationships.find(r => r.itemId === m.itemId)
    return createErDiagramEvent(e, m, m.itemId, 'relationship', data)
  })
