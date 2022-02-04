import { makeIdCounter } from '@pintora/core'
import { BaseDb } from '../util/base-db'
import { BaseDiagramIR } from '../util/ir'
import { ConfigParam, OverrideAction, ParamAction } from '../util/style'

export type LevelNotation = {
  depth: number
}

export type MMItem = {
  id: string
  depth: number
  label: string
  parent?: string
  isReverse: boolean
  children: string[]
}

export interface IMMDataTree {
  root: string
  nodes: Record<string, MMItem>
}

export class MMTree {
  root: MMItem
  private current: MMItem
  private nodes: Map<string, MMItem> = new Map()

  static fromRootItem(item: Omit<MMItem, 'parent'>) {
    const tree = new MMTree()
    tree.root = tree.addItemToNode({ ...item, parent: null })
    tree.current = tree.root
    return tree
  }

  add(item: MMItem) {
    let cur = this.current
    while (cur && Math.abs(cur.depth) >= Math.abs(item.depth)) {
      if (cur.id === this.root.id) break
      if (cur.parent) {
        cur = this.nodes.get(cur.parent)
        continue
      }
      break
    }

    if (!cur) {
      cur = this.root
    }
    if (cur === this.root || Math.abs(cur.depth) < Math.abs(item.depth)) {
      const newNode = this.addItemToNode(item)
      this.addChild(cur, newNode)
      this.current = newNode
    }
  }

  getNode(id: string) {
    return this.nodes.get(id)
  }

  private addChild(parent: MMItem, child: MMItem) {
    parent.children.push(child.id)
    child.parent = parent.id
  }

  private addItemToNode(item: MMItem): MMItem {
    if (!item.children) item.children = []
    this.nodes.set(item.id, item)
    return item
  }

  serialize(): IMMDataTree {
    const data: IMMDataTree = {
      root: this.root.id,
      nodes: {
        [this.root.id]: this.root,
      },
    }
    const visitor = (c: MMItem) => {
      data.nodes[c.id] = c
    }
    this.walkTree(this.root, visitor)
    return data
  }

  walkTree(node: MMItem, visitor: (c: MMItem) => unknown) {
    visitor(node)
    node.children.forEach(child => {
      const childNode = this.nodes.get(child)
      if (childNode) {
        this.walkTree(childNode, visitor)
      }
    })
  }
}

export type ApplyPart =
  | ParamAction
  | OverrideAction
  | {
      type: 'addItem'
      depth: number
      label: string
      isReverse?: boolean
    }

export type MindmapIR = BaseDiagramIR & {
  trees: IMMDataTree[]
}

class MindmapDb extends BaseDb {
  items: MMItem[] = []

  private currentTree: MMTree | null
  private trees: MMTree[] = []
  protected idCounter = makeIdCounter()
  /** get tree instance by data */
  protected treeMap: WeakMap<IMMDataTree, MMTree> = new WeakMap()

  protected makeId() {
    return this.idCounter.next()
  }

  getDiagramIR(): MindmapIR {
    return {
      ...this.getBaseDiagramIR(),
      trees: this.trees.map(tree => {
        const data = tree.serialize()
        this.treeMap.set(data, tree)
        return data
      }),
    }
  }

  private addItem(item: Omit<MMItem, 'parent'>) {
    if (!this.currentTree || item.depth === 1) {
      this.currentTree = MMTree.fromRootItem(item)
      this.trees.push(this.currentTree)
    } else {
      this.currentTree.add(item)
    }
  }

  apply(part: ApplyPart | ApplyPart[]) {
    if (!part) return
    if (Array.isArray(part)) {
      return part.map(c => this.apply(c))
    }
    switch (part.type) {
      case 'addItem': {
        const { type, ...data } = part
        // console.log('addItem', data)
        this.addItem({ ...data, id: this.makeId(), isReverse: Boolean(part.isReverse), children: [] })
        break
      }
      case 'addParam': {
        this.configParams.push(part)
        break
      }
      case 'overrideConfig': {
        this.addOverrideConfig(part)
        break
      }
    }
  }

  getTreeByData(data: IMMDataTree) {
    return this.treeMap.get(data)
  }

  override clear() {
    super.clear()
    this.idCounter.reset()
    this.trees = []
    this.items = []
    this.currentTree = null
  }
}

export const db = new MindmapDb()

export default db
