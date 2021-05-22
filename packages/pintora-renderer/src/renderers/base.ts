import { IDiagram, GraphicsIR, Mark, MarkType, MarkAttrs, MarkTypeMap } from "@pintora/core"
import { IGroup, ShapeCfg } from '@antv/g-base'
import { AbstractShape, AbstractCanvas, CanvasCfg, AbstractGroup } from '@antv/g-base'
import { IRenderer } from '../type'
import { Stack } from '../util'

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

export abstract class BaseRenderer implements IRenderer {
  container: HTMLElement | null = null
  protected gcvs?: AbstractCanvas
  constructor(protected ir: GraphicsIR) {
  }

  // abstract getMarkClass(type: MarkType): { new(cfg: ShapeCfg): AbstractShape }
  abstract getCanvasClass(): { new(cfg: CanvasCfg): AbstractCanvas }

  setContainer(c: HTMLElement) {
    this.container = c
    const canvasCls = this.getCanvasClass()
    const gcvs = new canvasCls({
      container: c,
      width: this.ir.width,
      height: this.ir.height,
    })
    this.gcvs = gcvs
    return this
  }

  protected renderGCanvas() {
    const gcvs = this.gcvs
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
          // const group = gcvs.addGroup(Group)
          const group = gcvs.addGroup()
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