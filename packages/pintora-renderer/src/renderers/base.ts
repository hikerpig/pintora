import { GraphicsIR, Mark, MarkAttrs, MarkType, MarkTypeMap } from '@pintora/core'
import { IGroup, AbstractCanvas, CanvasCfg, IShape, Event as GEvent } from '@antv/g-base'
import { EventHandler, IRenderer } from '../type'
import { noop, Stack } from '../util'
import { GraphicEvent } from '../event'

type Visitor<T extends Mark, Actions = unknown> = {
  enter(mark: T, actions?: Actions): boolean | void
  exit?(mark: T, actions?: Actions): void
}
type VisitorInput<T extends Mark> = Visitor<T> | Visitor<T>['enter']

type Visitors = {
  [K in MarkType]: VisitorInput<K extends keyof MarkTypeMap ? MarkTypeMap[K] : Mark>
}

function traverseScene<Actions = unknown>(
  mark: Mark,
  visitors: Partial<Visitors> & { default?: VisitorInput<Mark> },
  actions: Actions,
) {
  const visitor = visitors[mark.type] || visitors.default
  let visitorEnter: Visitor<Mark>['enter'] | undefined
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
    visitorEnter(mark, actions)
  }
  if (mark.type === 'group' && mark.children) {
    mark.children.forEach(child => {
      traverseScene(child, visitors, actions)
    })
  } else if (mark.type === 'symbol') {
    traverseScene(mark.mark, visitors, actions)
  }
  if (visitorExit) {
    visitorExit(mark, actions)
  }
}

export abstract class BaseRenderer implements IRenderer {
  container: HTMLElement | null = null
  /** The Canvas instance of `@antv/g-base` */
  protected gcvs?: AbstractCanvas

  /** A map from shape to mark, later we will use this to get mark in event handlers */
  protected shapeToMarkMap = new WeakMap<IShape | IGroup, Mark>()

  constructor(protected ir: GraphicsIR) {}

  abstract getCanvasClass(): { new (cfg: CanvasCfg): AbstractCanvas }

  setContainer(c: HTMLElement) {
    if (this.gcvs) {
      this.gcvs.destroy()
    }

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
        const shapeAttrs = self.preProcessMarkAttrs(mark)
        const shape = container.addShape(mark.type, {
          attrs: shapeAttrs as MarkAttrs,
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
          enter() {
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

  on(name: string, handler: EventHandler) {
    if (!this.gcvs) return noop
    const gcvs = this.gcvs
    const fn = (gEvent: GEvent) => {
      const mark = this.shapeToMarkMap.get(gEvent.shape)
      const markPath = gEvent.propagationPath.reduce((acc, shape) => {
        const m = this.shapeToMarkMap.get(shape)
        if (m) {
          acc.push(m)
        }
        return acc
      }, [])
      const event = new GraphicEvent(gEvent)
      event.mark = mark
      event.markPath = markPath
      handler(event)
    }
    gcvs.on(name, fn)
    return () => {
      gcvs.off(name, fn)
    }
  }

  protected preProcessMarkAttrs(mark: Mark): MarkAttrs | undefined {
    return mark.attrs
  }

  protected onShapeAdd(shape: IShape | IGroup, mark: Mark) {
    this.shapeToMarkMap.set(shape, mark)
  }

  render() {
    this.renderGCanvas()
  }
}
