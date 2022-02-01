import { ConfigParam } from '../util/style'

type Component = {
  name: string
  label?: string
  isGroup?: boolean
  children?: UMLElement[]
  parent?: string
}

type Interface = {
  name: string
  label?: string
  parent?: string
}

/** element group */
type CGroup = {
  groupType: string
  name: string
  label?: string
  children: UMLElement[]
  parent?: string
}

type ElementType = 'component' | 'interface' | 'group'

type ElementRef = {
  name: string
  type: ElementType
  parent?: string
}

export type Relationship = {
  from: ElementRef
  to: ElementRef
  message?: string
  parent?: string
  line: {
    lineType: LineType
    isReversed?: boolean
  }
}

type UMLElement = Component | Interface | CGroup | Relationship

type ApplyPart =
  | {
      type: 'component'
      name: string
      label?: string
    }
  | {
      type: 'interface'
      name: string
      label?: string
    }
  | {
      type: 'group'
      groupType: string
      name: string
      label?: string
      children: UMLElement[]
    }
  | {
      type: 'addConfig'
      key: string
      value: string
    }

export type ComponentDiagramIR = {
  components: Record<string, Component>
  interfaces: Record<string, Interface>
  groups: Record<string, CGroup>
  relationships: Relationship[]
  configParams: ConfigParam[]
}

export enum LineType {
  DOTTED_ARROW = 'DOTTED_ARROW',
  SOLID_ARROW = 'SOLID_ARROW',
  STRAIGHT = 'STRAIGHT',
  DOTTED = 'DOTTED',
}

class ComponentDb {
  protected aliases: Record<string, UMLElement> = {}
  protected components: Record<string, Component> = {}
  protected interfaces: Record<string, Interface> = {}
  protected groups: Record<string, CGroup> = {}
  protected relationships: Relationship[] = []
  protected configParams: ConfigParam[] = []

  LineType = LineType

  addComponent(name: string, comp: Component) {
    if (this.components[name]) return
    // console.log(`[db] Add component: ${name}`, comp);
    this.components[name] = comp
    this.aliases[name] = comp
  }

  addInterface(name: string, interf: Interface) {
    if (this.interfaces[name]) return
    // console.log(`[db] Add interface: ${name}`, interf);
    this.interfaces[name] = interf
    this.aliases[name] = interf
  }

  addGroup(name: string, group: CGroup) {
    if (this.groups[name]) return
    this.groups[name] = group
    this.aliases[name] = group
  }

  addRelationship(r: Relationship) {
    // console.log(`[db] Add relationship: `, r);
    this.relationships.push(r)
  }

  apply(part: ApplyPart | ApplyPart[]) {
    if (Array.isArray(part)) {
      return part.map(p => this.apply(p))
    }
    if (!part) return
    // console.log('apply', part)
    switch (part.type) {
      case 'addConfig':
        {
          this.configParams.push(part)
        }
        break
      default: {
      }
    }
  }

  fillMissingElements() {
    const elements = []
    const groupMap: Record<string, CGroup> = {}
    const walkGroup = (group: CGroup) => {
      groupMap[group.name] = group
      group.children.forEach(child => {
        if ('groupType' in child) {
          return walkGroup(child)
        }
        elements.push(child)
      })
    }
    for (const group of Object.values(this.groups)) {
      walkGroup(group)
    }

    this.relationships.forEach(r => {
      elements.push(r.from)
      elements.push(r.to)
    })

    function addNewElementToGroup<E extends { parent?: string }>(element: E) {
      const parentGroup = groupMap[element.parent]
      if (parentGroup) parentGroup.children.push(element as any)
    }

    elements.forEach(element => {
      const { name, type } = element
      if (this.aliases[name]) {
      } else {
        if (type === 'component') {
          if (!this.components[name] && !this.groups[name]) {
            this.addComponent(name, element)
            addNewElementToGroup(element)
          }
        } else if (type === 'interface') {
          if (!this.interfaces[name]) {
            this.addInterface(name, element)
            addNewElementToGroup(element)
          }
        }
      }
    })

    // correct relationship elements
    this.relationships.forEach(r => {
      ;[r.from, r.to].forEach(e => {
        const aliasEntity = this.aliases[e.name]
        if (aliasEntity) {
          if ('type' in aliasEntity && (aliasEntity as any).type !== e.type) {
            // console.log('alias', e, aliasEntity)
            Object.assign(e, aliasEntity)
          }
        }
      })
    })
  }

  getDiagramIR(): ComponentDiagramIR {
    return {
      components: this.components,
      interfaces: this.interfaces,
      groups: this.groups,
      relationships: this.relationships,
      configParams: this.configParams,
    }
  }

  clear() {
    this.aliases = {}
    this.components = {}
    this.interfaces = {}
    this.groups = {}
    this.relationships = []
    this.configParams = []
  }
}

const db = new ComponentDb()

export default db
