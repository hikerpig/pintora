export enum Cardinality {
  ZERO_OR_ONE = 'ZERO_OR_ONE',
  ZERO_OR_MORE = 'ZERO_OR_MORE',
  ONE_OR_MORE = 'ONE_OR_MORE',
  ONLY_ONE = 'ONLY_ONE',
}

export enum Identification {
  NON_IDENTIFYING = 'NON_IDENTIFYING',
  IDENTIFYING = 'IDENTIFYING',
}

export type Attribute = {
  attributeType: string
  attributeName: string
}

export type Entity = {
  attributes: Attribute[]
}

export type Relationship = {
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

export type ErDiagramIR = {
  entities: Record<string, Entity>
  relationships: Relationship[]
}

class ErDb {
  Cardinality = Cardinality
  Identification = Identification

  entities: Record<string, Entity> = {}
  relationships: Relationship[] = []

  addEntity(name: string) {
    if (!this.entities[name]) {
      this.entities[name] = { attributes: [] }
    }
    return this.entities[name]
  }
  addRelationship(entityA: string, roleA: string, entityB: string, relSpec: RelSpec) {
    const rel: Relationship = {
      entityA,
      roleA,
      entityB,
      relSpec,
    }

    this.relationships.push(rel)
  }
  getDiagramIR(): ErDiagramIR {
    return {
      entities: this.entities,
      relationships: this.relationships,
    }
  }
  addAttributes(name: string, attributes: Attribute[]) {
    const entity = this.addEntity(name)
    entity.attributes.push(...attributes)
  }
  clear() {
    this.entities = {}
    this.relationships = []
  }
}

const db = new ErDb()

export default db
