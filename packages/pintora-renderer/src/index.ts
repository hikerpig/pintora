import pintora, { IDiagram, GraphicsIR, Mark, MarkType, MarkAttrs, MarkTypeMap } from "@pintora/core"
import { IGroup } from '@antv/g-base'
import { Canvas, Group, IShape } from '@antv/g-svg'
import { Stack } from './util'

type Visitor<T extends Mark, Actions=any> = {
  enter(mark: T, actions?: any): boolean | void
  exit?(mark: T, actions?: any): void
}
type VisitorInput<T extends Mark> = Visitor<T> | Visitor<T>['enter']

type Visitors = {
  [K in MarkType]: VisitorInput<K extends keyof MarkTypeMap ? MarkTypeMap[K]: Mark>
}

function traverseScene<Actions=any>(mark: Mark, visitors: Partial<Visitors> & { default?: VisitorInput<Mark> }, actions: Actions) {
  const visitor = visitors[mark.type] || visitors.default
  let visitorEnter
  let visitorExit
  if (visitor) {
    if (typeof visitor === 'function') {
      visitorEnter = visitor
    } else {
      visitorEnter = visitor.enter
      visitorExit = visitor.exit
    }
  }
  if (visitorEnter) {
    visitorEnter(mark as any, actions)
  }
  if (mark.type === 'group' && mark.children) {
    mark.children.forEach((child) => {
      traverseScene(child, visitors, actions)
    })
  }
  if (visitorExit) {
    visitorExit(mark as any, actions)
  }
}

class SvgRenderer {
  container: HTMLElement | null = null
  protected gcvs?: Canvas
  constructor(protected ir: GraphicsIR) {
  }

  setContainer(c: HTMLElement) {
    this.container = c
    const gcvs = new Canvas({
      container: c,
      width: this.ir.width,
      height: this.ir.height,
    })
    this.gcvs = gcvs
    return this
  }

  protected renderGCanvas() {
    const gcvs = this.gcvs
    console.log('renderGCanvas', gcvs)
    if (!gcvs) return

    gcvs.clear()

    const groupStack = new Stack<IGroup>()
    const actions = {
      addToCurrentGroup(mark: Mark) {
        const group = groupStack.top()
        if (group) {
          const shape = group.addShape(mark.type, {
            attrs: mark.attrs as any
          })
          // console.log('new shape', shape, mark.attrs)
        }
      }
    }

    traverseScene(this.ir.mark, {
      group: {
        enter(mark) {
          const group = gcvs.addGroup(Group)
          groupStack.push(group)
        },
        exit() {
          groupStack.pop()
        }
      },
      rect(mark) {
        actions.addToCurrentGroup(mark)
      },
      text(mark) {
        actions.addToCurrentGroup(mark)
      },
      default(mark) {
        actions.addToCurrentGroup(mark)
      },
    }, actions)
  }

  render() {
    this.renderGCanvas()
  }
}

export function render(ir: GraphicsIR, opts: { container: any }) {
  console.log('TBD, render', ir)
  const renderer = new SvgRenderer(ir)
    .setContainer(opts.container)

  renderer.render()
}