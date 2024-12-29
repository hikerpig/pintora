import { BaseDiagramIR } from '../util/ir'
import { type OverrideConfigAction, type ParamAction, type SetTitleAction } from '../util/config'
import { BaseDb } from '../util/base-db'
import { STYLE_ACTION_HANDLERS, type StylePayloads } from '../util/style-engine/parser'
import { makeIdCounter } from '@pintora/core'

export enum Cardinality {
  ZERO_OR_ONE = 'ZERO_OR_ONE',
  ZERO_OR_MORE = 'ZERO_OR_MORE',
  ONE_OR_MORE = 'ONE_OR_MORE',
  ONLY_ONE = 'ONLY_ONE',
  MORE = 'MORE',
}

export enum Identification {
  NON_IDENTIFYING = 'NON_IDENTIFYING',
  IDENTIFYING = 'IDENTIFYING',
}

export type Attribute = {
  attributeType: string
  attributeName: string
  attributeKey?: string
  comment?: string
}

export type Entity = {
  itemId?: string
  name: string
  attributes: Attribute[]
}

export type Relationship = {
  itemId?: string
  entityA: string
  roleA: string
  entityB: string
  relSpec: RelSpec
}

export type RelSpec = {
  cardA: Cardinality
  cardB: Cardinality
  relType: Identification
}

export type Inheritance = {
  sup: string
  sub: string
}

export type ErDiagramIR = BaseDiagramIR & {
  entities: Record<string, Entity>
  relationships: Relationship[]
  inheritances: Inheritance[]
}

export type ApplyPart =
  | {
      type: 'addEntity'
      name: string
      attributes?: Attribute[]
    }
  | {
      type: 'addRelationship'
      entityA: string
      entityB: string
      roleA: string
      relSpec: RelSpec
    }
  | {
      type: 'addInheritance'
      sup: string
      sub: string
    }
  | ParamAction
  | OverrideConfigAction
  | SetTitleAction
  | ({
      type: 'bindClass'
    } & StylePayloads['bindClass'])

export class ErDb extends BaseDb {
  protected entities: Record<string, Entity> = {}
  protected relationships: Relationship[] = []
  protected inheritances: Inheritance[] = []
  protected idCounter = makeIdCounter()

  makeId() {
    return this.idCounter.next()
  }

  protected addEntity(e: Entity) {
    if (this.entities[e.name]) {
      this.entities[e.name].attributes.push(...e.attributes)
      return;
    }
    const itemId = `entity-${e.name}`
    const entity: Entity = {
      itemId,
      name: e.name,
      attributes: e.attributes || [],
    }
    this.entities[e.name] = entity
    return entity
  }

  apply(part: ApplyPart | ApplyPart[]) {
    if (!part) return
    if (Array.isArray(part)) {
      return part.map(p => this.apply(p))
    }

    switch (part.type) {
      case 'addEntity': {
        const entity = this.addEntity(part as Entity)
        return entity
      }
      case 'addRelationship': {
        this.addEntity({ name: part.entityA, attributes: [] })
        this.addEntity({ name: part.entityB, attributes: [] })
        const itemId = `relationship-${part.entityA}-${part.entityB}`
        const relationship: Relationship = {
          itemId,
          entityA: part.entityA,
          entityB: part.entityB,
          roleA: part.roleA,
          relSpec: part.relSpec,
        }
        this.relationships.push(relationship)
        return relationship
      }
      case 'addInheritance': {
        this.addEntity({ name: part.sup, attributes: [] })
        this.addEntity({ name: part.sub, attributes: [] })
        const inheritance: Inheritance = {
          sup: part.sup,
          sub: part.sub,
        }
        this.inheritances.push(inheritance)
        return inheritance
      }
      case 'setTitle': {
        this.title = part.text
        return null
      }
      case 'addParam': {
        this.configParams.push(part)
        break
      }
      case 'overrideConfig': {
        this.addOverrideConfig(part)
        break
      }
      case 'bindClass': {
        STYLE_ACTION_HANDLERS.bindClass.call(this, part)
        return null
      }
    }
  }

  getDiagramIR(): ErDiagramIR {
    return {
      ...this.getBaseDiagramIR(),
      entities: this.entities,
      relationships: this.relationships,
      inheritances: this.inheritances,
    }
  }

  override clear() {
    super.clear()
    this.entities = {}
    this.relationships = []
    this.inheritances = []
    this.idCounter = makeIdCounter()
  }
}

const db = new ErDb()

export default db
