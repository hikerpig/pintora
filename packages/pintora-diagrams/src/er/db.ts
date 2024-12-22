import { BaseDiagramIR } from '../util/ir'
import { ConfigParam } from '../util/config'
import { BaseDb } from '../util/base-db'
import { STYLE_ACTION_HANDLERS } from '../util/style-engine/parser'

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
  itemId: string
  attributes: Attribute[]
}

export type Relationship = {
  itemId: string
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

export class ErDb extends BaseDb {
  Cardinality = Cardinality
  Identification = Identification

  entities: Record<string, Entity> = {}
  relationships: Relationship[] = []
  inheritances: Inheritance[] = []

  addEntity(name: string) {
    if (!this.entities[name]) {
      this.entities[name] = { attributes: [], itemId: `entity-${name}` }
    }
    return this.entities[name]
  }
  addRelationship(entityA: string, roleA: string, entityB: string, relSpec: RelSpec) {
    const itemId = `relationship-${entityA}-${entityB}`
    const rel: Relationship = {
      entityA,
      roleA,
      entityB,
      relSpec,
      itemId,
    }

    this.relationships.push(rel)
  }
  addInheritance(sup: string, sub: string) {
    this.inheritances.push({ sup, sub })
  }
  getDiagramIR(): ErDiagramIR {
    return {
      ...super.getBaseDiagramIR(),
      entities: this.entities,
      relationships: this.relationships,
      inheritances: this.inheritances,
    }
  }
  addTitle(title: string) {
    this.title = title
  }
  addAttributes(name: string, attributes: Attribute[]) {
    const entity = this.addEntity(name)
    entity.attributes.push(...attributes)
  }
  addParam(styleParam: ConfigParam) {
    this.configParams.push(styleParam)
  }
  bindClass(action: any) {
    STYLE_ACTION_HANDLERS.bindClass.call(this, action)
  }

  override clear() {
    super.clear()
    this.entities = {}
    this.relationships = []
    this.inheritances = []
    this.configParams = []
    this.title = ''
  }
}

const db = new ErDb()

export default db
