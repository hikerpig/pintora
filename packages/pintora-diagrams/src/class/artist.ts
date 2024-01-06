import {
  calculateTextDimensions,
  Group,
  last,
  makeArtist,
  makeMark,
  movePointPosition,
  safeAssign,
  Text,
  TSize,
} from '@pintora/core'
import {
  adjustRootMarkBounds,
  ArrowType,
  calcDirection,
  drawArrowTo,
  makeEmptyGroup,
  makeLabelBg,
} from '../util/artist-util'
import { calcBound } from '../util/bound'
import { DagreWrapper } from '../util/dagre-wrapper'
import { BaseEdgeData, createLayoutGraph, getGraphSplinesOption, LayoutGraph, LayoutNode } from '../util/graph'
import { getMedianPoint, getPointsCurvePath, getPointsLinearPath } from '../util/line-util'
import { makeBounds, positionGroupContents, tryExpandBounds } from '../util/mark-positioner'
import { ClassConf, getConf } from './config'
import { ClassIR, TClass, ClassRelation, Relation } from './db'
import { isDev } from '../util/env'

const artist = makeArtist<ClassIR, ClassConf>({
  draw(ir, config, opts) {
    const rootMark = makeEmptyGroup()
    const conf = getConf(ir, config)

    const draw = new ClassDiagramDraw(ir, conf)
    if (isDev) {
      ;(window as any).classDraw = draw
    }

    const { gBounds } = draw.drawTo(rootMark)
    const { width, height } = adjustRootMarkBounds({
      rootMark,
      gBounds,
      padX: conf.diagramPadding,
      padY: conf.diagramPadding,
    })

    return {
      mark: rootMark,
      width,
      height,
    }
  },
})

class ClassDiagramDraw {
  dagreWrapper: DagreWrapper
  rootMark: Group
  relationGroupMark = makeEmptyGroup()
  markBuilder: EntityMarkBuilder
  protected elementBounds = makeBounds()
  constructor(
    public ir: ClassIR,
    public conf: ClassConf,
  ) {
    const g = createLayoutGraph({
      multigraph: true,
      directed: true,
      compound: true,
    }).setGraph({
      nodesep: 20,
      edgesep: conf.edgesep,
      ranksep: conf.ranksep,
      splines: getGraphSplinesOption(conf.edgeType),
      avoid_label_on_border: true,
    })
    this.dagreWrapper = new DagreWrapper(g)
  }

  drawTo(rootMark: Group) {
    this.rootMark = rootMark
    for (const classObj of Object.values(this.ir.classes)) {
      this.drawClass(classObj)
    }

    rootMark.children.push(this.relationGroupMark)
    for (const relation of this.ir.relations) {
      this.drawRelation(relation)
    }

    this.dagreWrapper.doLayout()
    this.dagreWrapper.callNodeOnLayout()
    this.dagreWrapper.callEdgeOnLayout()

    return {
      /** graph bounds */
      gBounds: tryExpandBounds(this.dagreWrapper.getGraphBounds(), this.elementBounds),
    }
  }

  /**
   * Draw one class
   */
  protected drawClass(classObj: TClass) {
    const markBuilder = new EntityMarkBuilder(this.dagreWrapper.g, this.conf)
    markBuilder.addHeader(classObj.fullName, classObj.annotation)
    this.markBuilder = markBuilder

    const fields = classObj.members.filter(m => !m.isMethod)
    const methods = classObj.members.filter(m => m.isMethod)

    for (const memberList of [fields, methods]) {
      const { index } = markBuilder.getCurrentSection()
      const nextSectionIndex = index + 1
      if (memberList.length) {
        for (const member of memberList) {
          markBuilder.addRow(nextSectionIndex, member.raw)
        }
      } else {
        markBuilder.addRow(nextSectionIndex, '')
      }
    }

    this.rootMark.children.push(markBuilder.group)

    const g = this.dagreWrapper.g

    const entitySize = markBuilder.getSize()
    g.setNode(classObj.fullName, {
      ...entitySize,
      onLayout(data) {
        // console.log('onLayout', data)
        markBuilder.onLayout(data)
      },
    })
  }

  protected drawRelation(r: ClassRelation) {
    const g = this.dagreWrapper.g
    const { conf, relationGroupMark } = this

    let labelDims: TSize
    const fontConfig = {
      fontSize: conf.fontSize,
      fontFamily: conf.fontFamily,
    }

    const startNodeId = r.reversed ? r.right : r.left
    const ednNodeId = r.reversed ? r.left : r.right

    let minlen = 1
    if (r.label) {
      labelDims = calculateTextDimensions(r.label, fontConfig)
      minlen = Math.ceil(labelDims.height / conf.ranksep) + 1
      const startNode = g.node(startNodeId)
      const extraPad = (labelDims.width - startNode.width) / 2
      if (extraPad > 0) {
        // so label won't overlap
        startNode.marginr = extraPad
        startNode.marginl = extraPad
      }
    }
    const leftLabelDims = r.labelLeft ? calculateTextDimensions(r.labelLeft, fontConfig) : null
    const rightLabelDims = r.labelRight ? calculateTextDimensions(r.labelRight, fontConfig) : null
    let leftLabelMark: Text
    let rightLabelMark: Text
    if (r.labelLeft) {
      minlen += Math.ceil(leftLabelDims.height / conf.ranksep)
      leftLabelMark = makeMark('text', {
        text: r.labelLeft,
        fill: conf.relationLineColor,
        class: 'class__label',
        ...fontConfig,
      })
      relationGroupMark.children.push(leftLabelMark)
    }
    if (r.labelRight) {
      minlen += Math.ceil(rightLabelDims.height / conf.ranksep)
      rightLabelMark = makeMark('text', {
        text: r.labelRight,
        fill: conf.relationLineColor,
        class: 'class__label',
        ...fontConfig,
      })
      relationGroupMark.children.push(rightLabelMark)
    }
    const startLabelMark = r.reversed ? rightLabelMark : leftLabelMark
    const endLabelMark = r.reversed ? leftLabelMark : rightLabelMark

    g.setEdge(startNodeId, ednNodeId, {
      label: r.relation,
      minlen,
      onLayout: (data: BaseEdgeData) => {
        // console.log('edge onlayout', data)
        const newPath = conf.edgeType === 'curved' ? getPointsCurvePath(data.points) : getPointsLinearPath(data.points)
        const lineMark = makeMark(
          'path',
          {
            path: newPath,
            stroke: conf.relationLineColor,
            lineCap: 'round',
            lineDash: r.dashed ? [2, 2] : null,
          },
          { class: 'class__rel-line' },
        )
        relationGroupMark.children.push(lineMark)
        if (r.label) {
          const anchorPoint = (minlen === 1 ? data.labelPoint : null) || getMedianPoint(data.points).point
          const relText = makeMark(
            'text',
            {
              text: r.label,
              fill: conf.relationTextColor,
              textAlign: 'center',
              textBaseline: 'middle',
              ...anchorPoint,
              ...fontConfig,
            },
            { class: 'class__rel-text' },
          )
          const relTextBg = makeLabelBg(labelDims, anchorPoint, {
            fill: conf.labelBackground,
          })
          const labelBounds = calcBound([relTextBg])
          tryExpandBounds(this.elementBounds, labelBounds)

          relationGroupMark.children.push(relTextBg, relText)
        }

        const lastPoint = data.points[data.points.length - 1]
        const pointsForDirection = data.points.slice(-2)
        const arrowRad = calcDirection.apply(null, pointsForDirection)
        const arrowHeadType: ArrowType = RELATION_TO_ARROW_TYPE[r.relation]
        if (arrowHeadType) {
          const arrowMark = drawArrowTo(lastPoint, 8, arrowRad, {
            color: conf.relationLineColor,
            type: arrowHeadType,
          })
          relationGroupMark.children.push(arrowMark)
        }

        // draw label beside intersection of node and line
        const LABEL_X_OFFSET = 5
        if (startLabelMark) {
          const startIntersectionPoint = data.points[2]
          safeAssign(startLabelMark.attrs, movePointPosition(startIntersectionPoint, { x: LABEL_X_OFFSET, y: 0 }))
        }

        if (endLabelMark) {
          safeAssign(endLabelMark.attrs, movePointPosition(lastPoint, { x: LABEL_X_OFFSET, y: 0 }))
        }
      },
    })
  }
}

const RELATION_TO_ARROW_TYPE: Partial<Record<Relation, ArrowType>> = {
  [Relation.INHERITANCE]: 'etriangle',
  [Relation.ASSOCIATION]: 'default',
  [Relation.COMPOSITION]: 'diamond',
  [Relation.AGGREGATION]: 'ediamond',
}

type EntityMarkRow = {
  labels: string[]
  labelMarks: Text[]
  labelDims: TSize
  yOffsetStart: number
  yOffsetEnd: number
  isHeader?: boolean
}

type EntitySection = {
  rows: EntityMarkRow[]
}

/**
 * Handles common logic of drawing an entity/class
 */
class EntityMarkBuilder {
  group: Group = makeEmptyGroup()
  rowPadding = 8
  /** y offset inside entity */
  curY = 0
  curHeight = 0

  sections: EntitySection[] = []

  constructor(
    public g: LayoutGraph,
    public conf: ClassConf,
  ) {}

  addHeader(label: string, annotation?: string) {
    let row: EntityMarkRow
    if (annotation) {
      row = this.addRow(0, [`<<${annotation}>>`, label])
    } else {
      row = this.addRow(0, label)
    }
    row.isHeader = true
    last(row.labelMarks).attrs.fontWeight = 'bold'
    return row
  }

  addRow(sectionIndex: number, labels: string | string[]) {
    if (!this.sections[sectionIndex]) {
      this.sections[sectionIndex] = {
        rows: [],
      }
    }
    const section = this.sections[sectionIndex]
    if (typeof labels === 'string') {
      labels = [labels]
    }
    const { rowPadding } = this
    const labelMarks = []
    const labelDims = { width: 0, height: 0 }
    let labelYOffset = 0
    for (const label of labels) {
      const fontConfig = this.getFontConfig()
      const dims = calculateTextDimensions(label, fontConfig)
      const labelMark = makeMark('text', {
        text: label,
        fill: this.conf.entityTextColor,
        x: 0,
        y: this.curY + labelYOffset + rowPadding,
        textAlign: 'center',
        textBaseline: 'hanging',
        ...dims,
        ...this.getFontConfig(),
      })
      const labelYDiff = dims.height + Math.floor(fontConfig.fontSize / 4)
      labelYOffset += labelYDiff
      labelMarks.push(labelMark)
      labelDims.width = Math.max(labelDims.width, dims.width)
      labelDims.height += labelYDiff
    }

    const yOffsetStart = this.curY
    const yDiff = labelDims.height + rowPadding * 2
    this.curY += yDiff
    this.curHeight += yDiff
    const row: EntityMarkRow = { labels, labelMarks, labelDims, yOffsetStart, yOffsetEnd: this.curY }
    section.rows.push(row)
    this.group.children.push(...labelMarks)

    return row
  }

  getCurrentSection() {
    const currentIndex = this.sections.length - 1
    return {
      index: currentIndex,
      section: this.sections[currentIndex],
    }
  }

  getSize() {
    let maxWidth = 0
    for (const section of this.sections) {
      for (const row of section.rows) {
        const { labelDims } = row
        maxWidth = Math.max(labelDims.width, maxWidth)
      }
    }
    return {
      width: maxWidth + this.rowPadding * 2,
      height: this.curHeight,
    }
  }

  onLayout(data: LayoutNode) {
    const rectSize = this.getSize()
    const bgRect = makeMark('rect', {
      ...rectSize,
      x: -rectSize.width / 2,
      y: -rectSize.height / 2,
      fill: this.conf.entityBackground,
      radius: this.conf.entityRadius,
      stroke: this.conf.entityBorderColor,
    })
    const halfClassHeight = rectSize.height / 2

    const sectionBgMarks = []
    const { rowPadding } = this

    const lastSection = last(this.sections)
    let bodySectionYStart = undefined
    let bodySectionYEnd = undefined
    this.sections.forEach((section, sectionIndex) => {
      if (!section.rows.length) {
        return
      }
      for (const row of section.rows) {
        // console.log('row', row.labels, row.labelDims)
        for (const labelMark of row.labelMarks) {
          if (!row.isHeader) {
            labelMark.attrs.x += (labelMark.attrs.width - rectSize.width) / 2 + rowPadding
          }
          labelMark.attrs.y += -halfClassHeight + rowPadding
        }
      }
      const firstRow = section.rows[0]
      const lastRow = last(section.rows)

      if (sectionIndex === 1) {
        bodySectionYStart = firstRow.yOffsetStart - halfClassHeight + rowPadding
      }

      if (sectionIndex > 0) {
        const lineY = firstRow.yOffsetStart - halfClassHeight + rowPadding
        const sepLine = makeMark(
          'line',
          {
            x1: -rectSize.width / 2,
            x2: rectSize.width / 2,
            y1: lineY,
            y2: lineY,
            stroke: this.conf.entityBorderColor,
          },
          { class: 'class-entity__sep-line' },
        )

        this.group.children.push(sepLine)
      }
      if (section === lastSection) {
        bodySectionYEnd = lastRow.yOffsetEnd - halfClassHeight
      }
    })
    if (typeof bodySectionYStart !== 'undefined' && typeof bodySectionYEnd !== 'undefined') {
      const lineY = bodySectionYStart
      const sectionBg = makeMark('rect', {
        width: rectSize.width,
        height: bodySectionYEnd - bodySectionYStart,
        x: -rectSize.width / 2,
        y: lineY,
        fill: this.conf.entityBodyBackground,
        stroke: this.conf.entityBorderColor,
        class: 'class__section-bg',
        // opacity: 0.4, // for layout debug
      })
      this.group.children.unshift(sectionBg)
    }
    this.group.children.unshift(bgRect, ...sectionBgMarks)

    positionGroupContents(this.group, data)
    // // debug
    // const debugPoint = makeCircleWithCoordInPoint(data)
    // this.group.children.push(debugPoint)
    // // end --- debug
  }

  getFontConfig() {
    return {
      fontFamily: this.conf.fontFamily,
      fontSize: this.conf.fontSize,
    }
  }
}

export default artist
