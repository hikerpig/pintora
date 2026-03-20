import { BaseDiagramIR } from '../util/ir'
import { type OverrideConfigAction, type ParamAction, type SetTitleAction } from '../util/config'
import { BaseDb } from '../util/base-db'
import { STYLE_ACTION_HANDLERS, type StylePayloads } from '../util/style-engine/parser'
import { makeIdCounter } from '@pintora/core'

export type Actor = {
  itemId?: string
  name: string
  label?: string
}

export type UseCase = {
  itemId?: string
  name: string
  label?: string
}

export type SystemBoundary = {
  itemId?: string
  name: string
  label?: string
  actors: string[]
  useCases: string[]
}

export enum RelationType {
  ASSOCIATION = 'ASSOCIATION',
  INHERITANCE = 'INHERITANCE',
  GENERALIZATION = 'GENERALIZATION',
  INCLUDE = 'INCLUDE',
  EXTEND = 'EXTEND',
}

export type Relation = {
  itemId?: string
  from: string
  to: string
  type: RelationType
  label?: string
}

export type Note = {
  itemId?: string
  text: string
  of?: string
}

export type UseCaseDiagramIR = BaseDiagramIR & {
  actors: Record<string, Actor>
  useCases: Record<string, UseCase>
  systemBoundaries: Record<string, SystemBoundary>
  relations: Relation[]
  notes: Note[]
}

export type ApplyPart =
  | {
      type: 'addActor'
      name: string
      label?: string
    }
  | {
      type: 'addUseCase'
      name: string
      label?: string
    }
  | {
      type: 'addSystemBoundary'
      name: string
      label?: string
      actors?: string[]
      useCases?: string[]
    }
  | {
      type: 'addRelation'
      from: string
      to: string
      relationType: RelationType
      label?: string
    }
  | {
      type: 'addNote'
      text: string
      of?: string
    }
  | ParamAction
  | OverrideConfigAction
  | SetTitleAction
  | ({
      type: 'bindClass'
    } & StylePayloads['bindClass'])

export class UseCaseDb extends BaseDb {
  protected actors: Record<string, Actor> = {}
  protected useCases: Record<string, UseCase> = {}
  protected systemBoundaries: Record<string, SystemBoundary> = {}
  protected relations: Relation[] = []
  protected notes: Note[] = []
  protected idCounter = makeIdCounter()

  makeId() {
    return this.idCounter.next()
  }

  protected addActor(a: Actor) {
    if (this.actors[a.name]) {
      if (a.label) this.actors[a.name].label = a.label
      return this.actors[a.name]
    }
    const itemId = `actor-${a.name}`
    const actor: Actor = {
      itemId,
      name: a.name,
      label: a.label,
    }
    this.actors[a.name] = actor
    return actor
  }

  protected addUseCase(uc: UseCase) {
    if (this.useCases[uc.name]) {
      if (uc.label) this.useCases[uc.name].label = uc.label
      return this.useCases[uc.name]
    }
    const itemId = `usecase-${uc.name}`
    const useCase: UseCase = {
      itemId,
      name: uc.name,
      label: uc.label,
    }
    this.useCases[uc.name] = useCase
    return useCase
  }

  apply(part: ApplyPart | ApplyPart[]) {
    if (!part) return
    if (Array.isArray(part)) {
      return part.map(p => this.apply(p))
    }

    switch (part.type) {
      case 'addActor': {
        const actor = this.addActor(part as Actor)
        return actor
      }
      case 'addUseCase': {
        const useCase = this.addUseCase(part as UseCase)
        return useCase
      }
      case 'addSystemBoundary': {
        const itemId = `system-${part.name}`
        const systemBoundary: SystemBoundary = {
          itemId,
          name: part.name,
          label: part.label,
          actors: part.actors || [],
          useCases: part.useCases || [],
        }
        this.systemBoundaries[part.name] = systemBoundary
        return systemBoundary
      }
      case 'addRelation': {
        const itemId = `relation-${part.from}-${part.to}-${this.makeId()}`
        const relation: Relation = {
          itemId,
          from: part.from,
          to: part.to,
          type: part.relationType,
          label: part.label,
        }
        this.relations.push(relation)
        return relation
      }
      case 'addNote': {
        const itemId = `note-${this.makeId()}`
        const note: Note = {
          itemId,
          text: part.text,
          of: part.of,
        }
        this.notes.push(note)
        return note
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

  getDiagramIR(): UseCaseDiagramIR {
    return {
      ...this.getBaseDiagramIR(),
      actors: this.actors,
      useCases: this.useCases,
      systemBoundaries: this.systemBoundaries,
      relations: this.relations,
      notes: this.notes,
    }
  }

  override clear() {
    super.clear()
    this.actors = {}
    this.useCases = {}
    this.systemBoundaries = {}
    this.relations = []
    this.notes = []
    this.idCounter = makeIdCounter()
  }
}

const db = new UseCaseDb()

export default db
