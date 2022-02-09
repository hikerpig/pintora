import { GraphicsIR, Mark, MarkType, MarkTypeMap } from '@pintora/core'
import { IGroup, AbstractCanvas, CanvasCfg, IShape } from '@antv/g-base'
import { IRenderer } from '../type'
import { Stack } from '../util'

type Visitor<T extends Mark, Actions = any> = {
  enter(mark: T, actions?: Actions): boolean | void
  exit?(mark: T, actions?: Actions): void
}
type VisitorInput<T extends Mark> = Visitor<T> | Visitor<T>['enter']

type Visitors = {
  [K in MarkType]: VisitorInput<K extends keyof MarkTypeMap ? MarkTypeMap[K] : Mark>
}

function traverseScene<Actions = any>(
  mark: Mark,
  visitors: Partial<Visitors> & { default?: VisitorInput<Mark> },
  actions: Actions,
) {
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
    mark.children.forEach(child => {
      traverseScene(child, visitors, actions)
    })
  } else if (mark.type === 'symbol') {
    traverseScene(mark.mark, visitors, actions)
  }
  if (visitorExit) {
    visitorExit(mark as any, actions)
  }
}

export abstract class BaseRenderer implements IRenderer {
  container: HTMLElement | null = null
  protected gcvs?: AbstractCanvas
  constructor(protected ir: GraphicsIR) {}

  // abstract getMarkClass(type: MarkType): { new(cfg: ShapeCfg): AbstractShape }
  abstract getCanvasClass(): { new (cfg: CanvasCfg): AbstractCanvas }

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

  getRootElement() {
    if (!this.gcvs) return
    return this.gcvs.cfg.el
  }

  protected addBgShape() {
    if (this.ir.bgColor) {
      this.gcvs?.addShape('rect', {
        attrs: {
          width: this.ir.width,
          height: this.ir.height,
          fill: this.ir.bgColor,
        },
      })
    }
  }

  protected renderGCanvas() {
    const gcvs = this.gcvs
    if (!gcvs) return

    gcvs.clear()
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const self = this

    this.addBgShape()

    const groupStack = new Stack<IGroup>()
    const actions = {
      addToCurrentGroup(mark: Mark) {
        const group = groupStack.top()
        const container = group || gcvs
        const shape = container.addShape(mark.type, {
          attrs: mark.attrs as any,
        })
        self.onShapeAdd(shape, mark)
        // console.log('new shape', el, shape, mark.attrs)
        return shape
      },
      applyMarkPostProcess(mark: Mark, shape: IShape | IGroup) {
        if (mark.matrix) {
          shape.setMatrix(mark.matrix as number[])
        }
      },
    }

    traverseScene(
      this.ir.mark,
      {
        group: {
          enter(mark) {
            const prevGroup = groupStack.top()
            const container = prevGroup || gcvs
            const group = container.addGroup()
            groupStack.push(group)
            self.onShapeAdd(group, mark)
            actions.applyMarkPostProcess(mark, group)
          },
          exit() {
            groupStack.pop()
          },
        },
        symbol: {
          enter(mark) {
            // prevent entering default visitor
          },
        },
        default(mark) {
          const shape = actions.addToCurrentGroup(mark)
          actions.applyMarkPostProcess(mark, shape)
        },
      },
      actions,
    )
  }

  // eslint-disable-next-line
  protected onShapeAdd(shape: IShape | IGroup, mark: Mark) {}

  render() {
    this.renderGCanvas()
  }
}
