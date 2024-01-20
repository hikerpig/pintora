/* eslint-disable @typescript-eslint/no-empty-function */
import { BaseDiagramIR } from '../util/ir'
import { ActionHandler, BaseDb, MakeAction } from '../util/base-db'
import { ConfigParam } from '@pintora/core'
import { OverrideConfigAction } from '../util/config'
import dedent from 'dedent'

/** type to represent one class  */
export type TClass = {
  name: string
  fullName: string
  label?: string
  namespace?: string
  members: TClassMember[]
  annotation?: string
}

export type ClassRelation = {
  left: string
  right: string
  relation: Relation
  label?: string
  labelLeft?: string
  labelRight?: string
  dashed?: boolean
  /**
   * normally we draw the relation from left to right, if reversed is true, we draw the relation from right to left
   */
  reversed?: boolean
}

type Access = 'public' | 'private' | 'protected'

type Modifier = 'abstract' | 'static' | null

export type TClassMember = {
  name: string
  typeName: string
  raw: string
  access?: Access
  isMethod?: boolean
  modifier?: Modifier
}

export enum Relation {
  INHERITANCE = 'INHERITANCE',
  COMPOSITION = 'COMPOSITION',
  AGGREGATION = 'AGGREGATION',
  ASSOCIATION = 'ASSOCIATION',
  LINK = 'LINK',
}

export type Note = {
  id: string
  text: string
  placement: string
  target?: string
}

type ClassActionPayloads = {
  addClass: Pick<TClass, 'name'> & {
    members: Array<RawMember | RawAnnotation>
    label?: string
  }
  addClassMember: { className: string; member: RawMember }
  addRelation: { left: string; right: string; relationRaw: { type: Relation; dashed: boolean } }
  addAnnotation: { className: string; annotation: string }
  overrideConfig: OverrideConfigAction
  addParam: ConfigParam
  note: {
    text: string
    placement: string
    target?: string
  }
}

type RawMember = {
  raw: string
  modifier: Modifier
}

type RawAnnotation = {
  annotation: string
}

export type Action = MakeAction<ClassActionPayloads>

export type ClassIR = BaseDiagramIR & {
  classes: Record<string, TClass>
  relations: ClassRelation[]
  notes: Note[]
}

const NAMESPACE_SEP = '.'
const FIELD_SEP = ':'

export class ClassDb extends BaseDb {
  protected classes: Record<string, TClass> = {}
  protected relations: ClassRelation[] = []
  protected notes: Note[] = []

  ACTION_HANDLERS: { [K in keyof ClassActionPayloads]: ActionHandler<ClassActionPayloads, ClassDb, K> } = {
    addClass(action) {
      let classObj: TClass = this.classes[action.name]
      const { type, ...restData } = action
      const data = this.parseClassAction(restData)
      if (!classObj) {
        classObj = data
      } else {
        Object.assign(classObj, data)
      }
      this.classes[action.name] = classObj
    },
    addClassMember(action) {
      const member = this.parseMemberLabel(action.member.raw)
      let classObj = this.classes[action.className]
      if (!classObj) {
        classObj = this.parseClassAction({ name: action.className, members: [] })
        this.classes[action.className] = classObj
      }
      classObj.members.push(member)
    },
    addRelation(action) {
      let leftClass = this.classes[action.left]
      if (!leftClass) {
        leftClass = this.parseClassAction({ name: action.left, members: [] })
        this.classes[action.left] = leftClass
      }

      let rightClass = this.classes[action.right]
      if (!rightClass) {
        rightClass = this.parseClassAction({ name: action.right, members: [] })
        this.classes[action.right] = rightClass
      }
      const { relationRaw, ...other } = action

      const relation: Partial<ClassRelation> = { ...other, relation: relationRaw.type }
      if (relationRaw.dashed) {
        relation.dashed = relationRaw.dashed
      }
      this.relations.push(relation as ClassRelation)
    },
    addAnnotation(action) {
      let classObj = this.classes[action.className]
      if (!classObj) {
        classObj = this.parseClassAction({ name: action.className, members: [] })
        this.classes[action.className] = classObj
      }
      classObj.annotation = action.annotation
    },
    note(action) {
      const id = `note-${action.target}-${action.placement}`
      const value: Note = { ...action, id, text: dedent(action.text) }
      this.notes.push(value)
    },
    overrideConfig(action) {
      this.addOverrideConfig(action)
    },
    addParam(action) {
      this.configParams.push(action)
    },
  }

  protected parseClassAction(payload: ClassActionPayloads['addClass']): TClass {
    const fullName = payload.name
    let name = payload.name
    let namespace = ''
    let annotation = ''
    const members: TClassMember[] = []
    if (payload.name.includes(NAMESPACE_SEP)) {
      const segs = payload.name.split(NAMESPACE_SEP)
      name = segs[segs.length - 1]
      namespace = segs.slice(0, segs.length - 1).join(NAMESPACE_SEP)
    }
    if (payload.members) {
      for (const m of payload.members) {
        if ('annotation' in m) {
          annotation = m.annotation
        } else {
          const parsedMember = this.parseMemberLabel(m.raw)
          parsedMember.modifier = m.modifier
          members.push(parsedMember)
        }
      }
    }
    const label = payload.label || name
    return {
      ...payload,
      name,
      namespace,
      fullName,
      members,
      annotation,
      label,
    }
  }

  protected parseMemberLabel(raw: string) {
    let name: string
    let typeName = ''
    let temp = raw
    const firstChar = temp[0]
    let access: Access = 'public'
    const isPrivate = firstChar === '-'
    const isProtected = firstChar === '#'
    const isPublic = firstChar === '+'

    if (isPrivate) access = 'private'
    else if (isProtected) access = 'protected'

    if (isPrivate || isProtected || isPublic) temp = temp.slice(1)

    if (temp.includes(FIELD_SEP)) {
      const pos = temp.indexOf(FIELD_SEP)
      name = temp.slice(0, pos)
      typeName = temp.slice(pos + 1, temp.length).trim()
    } else {
      const spacePos = temp.indexOf(' ')
      if (spacePos === -1) {
        name = temp.trim()
      } else {
        typeName = temp.slice(0, spacePos)
        name = temp.slice(spacePos + 1, temp.length).trim()
      }
    }

    const isMethod = /\(.*\)/.test(name)

    const member: TClassMember = {
      name,
      typeName,
      access,
      raw,
      isMethod,
    }
    return member
  }

  getDiagramIR(): ClassIR {
    return {
      ...super.getBaseDiagramIR(),
      classes: this.classes,
      relations: this.relations,
      notes: this.notes,
    }
  }

  apply(action: Action | Action[]) {
    if (!action) return
    if (Array.isArray(action)) {
      action.forEach(a => this.apply(a))
      return
    }
    if (action.type in this.ACTION_HANDLERS) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      this.ACTION_HANDLERS[action.type].call(this, action as any)
    }
  }

  override clear() {
    super.clear()
    this.classes = {}
    this.relations = []
    this.notes = []
  }
}

const db = new ClassDb()

export default db
