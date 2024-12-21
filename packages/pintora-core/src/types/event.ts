import { Mark } from './graphics'

/**
 * Graphic event that triggered from the renderer
 */
export interface IGraphicEvent {
  type: DiagramEventType
  /**
   * Target mark
   */
  mark: Mark | undefined
  /**
   * Mark chain, bottom up from target mark to the top container
   */
  markPath: Mark[] | undefined

  /** x on the renderer canvas */
  x: number
  /** y on the renderer canvas */
  y: number
  /** x on the window */
  clientX: number
  /** y on the window */
  clientY: number
}

/**
 * Diagram event that recognized and reduced from IGraphicEvent,
 *   has more logic data of the DiagramIR
 */
export interface IDiagramEvent<
  D extends keyof PintoraDiagramItemDatas = any,
  T extends keyof PintoraDiagramItemDatas[D] = any,
> {
  type: DiagramEventType
  graphicEvent: IGraphicEvent
  item: DiagramEventItem<D, T>
}

/**
 * Item that holds data in event payload
 */
export type DiagramEventItem<
  D extends keyof PintoraDiagramItemDatas = any,
  T extends keyof PintoraDiagramItemDatas[D] = any,
> = {
  /**
   * From which diagram
   */
  diagram: D
  /**
   * Data item type, e.g. 'entity' in a er diagram
   */
  type: T
  /**
   * Often relates to `mark.itemId`
   */
  id: string
  /**
   * Extra data that has different shape, depending on the type
   */
  data?: PintoraDiagramItemDatas[D][T]
}

/**
 * Avalaible diagram interaction type
 */
export type DiagramEventType =
  | 'click'
  | 'dblclick'
  | 'mousedown'
  | 'mouseup'
  | 'mouseenter'
  | 'mousemove'
  | 'mouseleave'
  | 'mouseout'

/**
 * An interface that holds diagram item data types and shapes.
 * Like `PintoraConfig`, this interface can be augmented later as more diagrams are being added.
 *
 * P.S. The default value `unknown` is just a placeholder.
 */
export interface PintoraDiagramItemDatas {
  unknown: {
    unknown: unknown
  }
}
