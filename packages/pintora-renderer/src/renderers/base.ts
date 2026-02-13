import { GraphicsIR, Mark, MarkAttrs, MarkType, MarkTypeMap } from '@pintora/core'
import {
  Group,
  Canvas,
  Shape,
  Element as GElement,
  IRenderer as IGRenderer,
  FederatedEvent,
  Rect,
  Path,
  Polygon,
  Polyline,
  Circle,
  Line,
  Ellipse,
  DisplayObjectConfig,
  Text,
  Image,
  DisplayObject,
} from '@antv/g'
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
  /** The Canvas instance of `@antv/g` */
  protected gcvs?: Canvas

  /** A map from shape to mark, later we will use this to get mark in event handlers */
  protected shapeToMarkMap = new WeakMap<GElement | Group, Mark>()

  constructor(protected ir: GraphicsIR) {}

  abstract getGRenderer(): IGRenderer

  setContainer(c: HTMLElement) {
    if (this.gcvs) {
      this.gcvs.destroy()
    }

    this.container = c
    const renderer = this.getGRenderer()
    const gcvs = new Canvas({
      container: c,
      width: this.ir.width,
      height: this.ir.height,
      renderer,
    })
    this.gcvs = gcvs
    return this
  }

  abstract getRootElement(): Element

  protected addBgShape() {
    if (this.ir.bgColor && this.gcvs) {
      this.addShape(this.gcvs, Shape.RECT, {
        style: {
          width: this.ir.width,
          height: this.ir.height,
          fill: this.ir.bgColor,
        },
      })
    }
  }

  shapeMap: Partial<Record<Shape, any>> = {
    [Shape.RECT]: Rect,
    [Shape.GROUP]: Group,
    [Shape.PATH]: Path,
    [Shape.POLYGON]: Polygon,
    [Shape.POLYLINE]: Polyline,
    [Shape.CIRCLE]: Circle,
    [Shape.LINE]: Line,
    [Shape.ELLIPSE]: Ellipse,
    [Shape.TEXT]: Text,
    [Shape.IMAGE]: Image,
  }

  protected addShape(parent: GElement | Canvas, shapeType: Shape, options: DisplayObjectConfig<any>) {
    // console.log('shapeType', shapeType)
    const element = this.gcvs!.document.createElement(shapeType, options)
    ;(parent as any).appendChild(element)
    return element
    // const shapeCtor = this.shapeMap[shapeType] || Rect
    // const element = new shapeCtor(options)
    // ;(parent as any).appendChild(element)
    // return element
  }

  protected renderGCanvas() {
    const gcvs = this.gcvs
    if (!gcvs) return

    gcvs.removeChildren()
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const self = this

    this.addBgShape()

    const groupStack = new Stack<Group>()
    const actions = {
      addToCurrentGroup: (mark: Mark) => {
        const group = groupStack.top()
        const container = group || gcvs
        const shapeAttrs = self.preProcessMarkAttrs(mark)
        // Extract id from attrs to pass as config.id for @antv/g v6 compatibility
        const { id, ...restAttrs } = shapeAttrs || {}
        const shape = this.addShape(container, mark.type as any, {
          id,
          style: restAttrs as MarkAttrs,
        })
        self.onShapeAdd(shape, mark)
        // console.log('new shape', el, shape, mark.attrs)
        return shape
      },
      applyMarkPostProcess(mark: Mark, shape: DisplayObject) {
        if (mark.matrix) {
          // const m = mark.matrix
          // const values = Array.from(m.values())
          // const a = 0
          // const b = 0
          // const c = 0
          // const d = 0
          // const tx = m[6]
          // const ty = m[7]
          // shape.style.transform = `matrix(${a}, ${b}, ${c}, ${d}, ${tx}, ${ty})`
          // console.log('mark matrix', mark.type, mark.matrix)
          shape.setLocalMatrix(mark.matrix as any)
          // shape.setMatrix(mark.matrix as any)
        }
      },
    }

    const defaultVisitor: VisitorInput<Mark> = mark => {
      const shape = actions.addToCurrentGroup(mark)
      actions.applyMarkPostProcess(mark, shape)
    }

    traverseScene(
      this.ir.mark,
      {
        group: {
          enter(mark) {
            const prevGroup = groupStack.top()
            const container = prevGroup || gcvs
            // In @antv/g v6, Group does not support x/y in style
            // Children already have absolute coordinates, so we should not set Group's position
            const { id, ...restAttrs } = mark.attrs || {}
            const group = new Group({
              id,
              style: restAttrs as any,
            })
            container.appendChild(group)
            groupStack.push(group)
            self.onShapeAdd(group, mark)
            actions.applyMarkPostProcess(mark, group)
          },
          exit() {
            groupStack.pop()
          },
        },
        path(mark) {
          // undefined x or y on path will cause layout problem in @antv/g
          // so we need to apply a default value to them
          mark.attrs.x = mark.attrs.x || 0
          mark.attrs.y = mark.attrs.y || 0
          defaultVisitor(mark)
        },
        symbol: {
          enter() {
            // prevent entering default visitor
          },
        },
        default: defaultVisitor,
      },
      actions,
    )
    ;(globalThis as any).gcvs = this.gcvs
    this.gcvs?.render()
  }

  on(name: string, handler: EventHandler) {
    if (!this.gcvs) return noop
    const gcvs = this.gcvs
    const fn = (gEvent: FederatedEvent) => {
      const mark = this.shapeToMarkMap.get(gEvent.target as GElement)
      const markPath = gEvent.path.reduce((acc, shape) => {
        const m = this.shapeToMarkMap.get(shape as GElement)
        if (m) {
          acc.push(m)
        }
        return acc
      }, [] as Mark[])
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
    const attrs: MarkAttrs = { ...mark.attrs }
    // @antv/g 6 uses `d` instead of `path` for Path shape
    if (mark.type === 'path' && attrs.path !== undefined && attrs.d === undefined) {
      attrs.d = attrs.path
      delete attrs.path
    }
    return attrs
  }

  protected onShapeAdd(shape: GElement, mark: Mark) {
    this.shapeToMarkMap.set(shape, mark)
  }

  render() {
    if (!this.gcvs) return
    this.gcvs.ready.then(() => {
      this.renderGCanvas()
    })
  }
}
