import {
  calculateTextDimensions,
  Group,
  ITheme,
  last,
  Line,
  makeMark,
  movePointPosition,
  Rect,
  safeAssign,
  Text,
  TSize,
  type IFont,
} from '@pintora/core'
import {
  adjustRootMarkBounds,
  ArrowType,
  calcDirection,
  DiagramTitleMaker,
  drawArrowTo,
  getBaseNote,
  makeEmptyGroup,
  makeLabelBg,
} from '../util/artist-util'
import { calcBound, calcTextBound } from '../util/bound'
import type { EnhancedConf } from '../util/config'
import { DagreWrapper } from '../util/dagre-wrapper'
import { setDevGlobal } from '../util/env'
import { getFontConfig } from '../util/font-config'
import {
  BaseEdgeData,
  createLayoutGraph,
  getGraphSplinesOption,
  LayoutEdgeOption,
  LayoutGraph,
  LayoutNode,
} from '../util/graph'
import { getPointsCurvePath, getPointsLinearPath } from '../util/line-util'
import { makeBounds, positionGroupContents, tryExpandBounds } from '../util/mark-positioner'
import { ClassConf, getConf } from './config'
import { ClassIR, ClassRelation, Note, Relation, TClass } from './db'
import { BaseArtist } from '../util/base-artist'

class ClassArtist extends BaseArtist<ClassIR, ClassConf> {
  customDraw(ir, config, opts) {
    const rootMark = makeEmptyGroup()
    const conf = getConf(ir, config)

    const draw = new ClassDiagramDraw(ir, conf)
    setDevGlobal('classDraw', draw)

    const { gBounds } = draw.drawTo(rootMark)
    const titleMaker = new DiagramTitleMaker({
      title: ir.title,
      titleFont: draw.fontConfig,
      fill: conf.noteTextColor,
      className: 'class__title',
    })
    const titleResult = titleMaker.appendTitleMark(rootMark)
    const { width, height } = adjustRootMarkBounds({
      rootMark,
      gBounds,
      padX: conf.diagramPadding,
      padY: conf.diagramPadding,
      titleMark: titleResult.titleMark,
      titleSize: titleResult.titleSize,
    })

    return {
      mark: rootMark,
      width,
      height,
    }
  }
}
const artist = new ClassArtist()

// Layout constants for relation edges
const DUMMY_NODE_PADDING = { width: 10, height: 4 }
const DUMMY_NODE_SIZE = 1
const ARROW_SIZE = 8
const DASH_PATTERN: number[] = [2, 2]

class ClassDiagramDraw {
  dagreWrapper: DagreWrapper
  rootMark: Group
  relationGroupMark = makeEmptyGroup()
  markBuilder: EntityMarkBuilder
  theme: ITheme
  fontConfig: IFont
  protected elementBounds = makeBounds()
  /** Track edge count between node pairs to handle multiple edges */
  protected edgeCountMap = new Map<string, number>()

  constructor(
    public ir: ClassIR,
    public conf: EnhancedConf<ClassConf>,
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
    this.theme = this.conf.themeConfig.themeVariables
    this.fontConfig = getFontConfig(this.conf)
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

    for (const note of this.ir.notes) {
      this.drawNote(note)
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
    markBuilder.group.itemId = classObj.itemId

    const fields = classObj.members.filter(m => !m.isMethod)
    const methods = classObj.members.filter(m => m.isMethod)

    for (const memberList of [fields, methods]) {
      const { index } = markBuilder.getCurrentSection()
      const nextSectionIndex = index + 1
      if (memberList.length) {
        for (const member of memberList) {
          markBuilder.addRow(nextSectionIndex, [
            {
              label: member.raw,
              italic: member.modifier === 'abstract',
              underline: member.modifier === 'static',
            },
          ])
        }
      } else {
        markBuilder.addRow(nextSectionIndex, [''])
      }
    }

    this.rootMark.children.push(markBuilder.group)

    const g = this.dagreWrapper.g

    const entitySize = markBuilder.getSize()
    g.setNode(classObj.fullName, {
      id: classObj.fullName,
      ...entitySize,
      onLayout(data) {
        // console.log('onLayout', data)
        markBuilder.onLayout(data)
      },
    })
  }

  protected drawRelation(r: ClassRelation) {
    const g = this.dagreWrapper.g
    const { conf, relationGroupMark, fontConfig } = this

    let labelDims: TSize

    const startNodeId = r.reversed ? r.right : r.left
    const endNodeId = r.reversed ? r.left : r.right

    // Track edge count between this node pair
    const edgeKey = `${startNodeId}--${endNodeId}`
    const edgeIndex = this.edgeCountMap.get(edgeKey) || 0
    this.edgeCountMap.set(edgeKey, edgeIndex + 1)

    // Calculate label dimensions
    if (r.label) {
      labelDims = calculateTextDimensions(r.label, fontConfig)
    }
    const leftLabelDims = r.labelLeft ? calculateTextDimensions(r.labelLeft, fontConfig) : null
    const rightLabelDims = r.labelRight ? calculateTextDimensions(r.labelRight, fontConfig) : null

    // Create label marks for multiplicity labels
    let leftLabelMark: Text
    let rightLabelMark: Text
    if (r.labelLeft) {
      leftLabelMark = makeMark('text', {
        text: r.labelLeft,
        fill: conf.relationLineColor,
        class: 'class__label',
        ...fontConfig,
      })
      relationGroupMark.children.push(leftLabelMark)
    }
    if (r.labelRight) {
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

    const startLabelDims = r.labelLeft ? leftLabelDims : rightLabelDims
    const endLabelDims = r.labelLeft ? rightLabelDims : leftLabelDims

    // Use edge index as the edge name to support multiple edges between same nodes
    const edgeName = `edge_${edgeIndex}`

    // Calculate minlen based on labelLeft and labelRight heights
    let minlenLeft = 1
    if (r.labelLeft) {
      minlenLeft += Math.ceil(leftLabelDims.height / conf.ranksep)
    }
    let minlenRight = 1
    if (r.labelRight) {
      minlenRight += Math.ceil(rightLabelDims.height / conf.ranksep)
    }

    // Always use a dummy node in the middle to ensure consistent layout
    // This helps dagre to properly separate multiple edges between the same nodes
    const dummyNodeId = `dummy_${edgeKey}_${edgeIndex}`

    // Calculate dummy node size based on label
    const dummyWidth = r.label ? labelDims.width + DUMMY_NODE_PADDING.width : DUMMY_NODE_SIZE
    const dummyHeight = r.label ? labelDims.height + DUMMY_NODE_PADDING.height : DUMMY_NODE_SIZE

    g.setNode(dummyNodeId, {
      width: dummyWidth,
      height: dummyHeight,
      isDummy: true,
      onLayout: (data: LayoutNode) => {
        // Draw the relation label at the dummy node position
        if (r.label) {
          const relText = makeMark(
            'text',
            {
              text: r.label,
              fill: conf.relationTextColor,
              textAlign: 'center',
              textBaseline: 'middle',
              x: data.x,
              y: data.y,
              ...fontConfig,
            },
            { class: 'class__rel-text' },
          )
          const relTextBg = makeLabelBg(
            labelDims,
            { x: data.x, y: data.y },
            {
              fill: conf.labelBackground,
            },
          )
          const labelBounds = calcBound([relTextBg])
          tryExpandBounds(this.elementBounds, labelBounds)
          relationGroupMark.children.push(relTextBg, relText)
        }
      },
    })

    const edgeSpaceWidth = Math.max(startLabelDims?.width || 0, endLabelDims?.width || 0, labelDims?.width || 0)
    const SIDE_LABEL_X_OFFSET = 5

    // Create two edges: start -> dummy -> end
    // First edge: start -> dummy
    this.createEdgeSegment(
      startNodeId,
      dummyNodeId,
      minlenLeft,
      (data: BaseEdgeData) => {
        const lineMark = this.createEdgeLineMark(data, r.dashed)
        relationGroupMark.children.push(lineMark)

        // Draw start label beside the first segment
        if (startLabelMark && data.points.length >= 2) {
          const startIntersectionPoint = data.points[2]
          safeAssign(startLabelMark.attrs, movePointPosition(startIntersectionPoint, { x: SIDE_LABEL_X_OFFSET, y: 0 }))
          const labelBounds = calcTextBound(startLabelMark, fontConfig)
          tryExpandBounds(this.elementBounds, labelBounds)
        }
      },
      `${edgeName}_1`,
      {
        width: edgeSpaceWidth,
      },
    )

    // Second edge: dummy -> end
    this.createEdgeSegment(
      dummyNodeId,
      endNodeId,
      minlenRight,
      (data: BaseEdgeData) => {
        const lineMark = this.createEdgeLineMark(data, r.dashed)
        relationGroupMark.children.push(lineMark)

        const lastPoint = data.points[data.points.length - 1]
        const pointsForDirection = data.points.slice(-2)
        const arrowRad = calcDirection.apply(null, pointsForDirection)
        const arrowHeadType: ArrowType = RELATION_TO_ARROW_TYPE[r.relation]
        if (arrowHeadType) {
          const arrowMark = drawArrowTo(lastPoint, ARROW_SIZE, arrowRad, {
            color: conf.relationLineColor,
            type: arrowHeadType,
          })
          relationGroupMark.children.push(arrowMark)
        }

        // Draw end label beside the last segment
        if (endLabelMark && data.points.length >= 2) {
          const endIntersectionPoint = data.points[data.points.length - 2]
          safeAssign(endLabelMark.attrs, movePointPosition(endIntersectionPoint, { x: SIDE_LABEL_X_OFFSET, y: 0 }))
          const labelBounds = calcTextBound(endLabelMark, fontConfig)
          tryExpandBounds(this.elementBounds, labelBounds)
        }
      },
      `${edgeName}_2`,
      {
        width: edgeSpaceWidth,
      },
    )
  }

  /** Creates a line mark for an edge segment */
  private createEdgeLineMark(data: BaseEdgeData, dashed: boolean) {
    const { conf } = this
    const newPath = conf.edgeType === 'curved' ? getPointsCurvePath(data.points) : getPointsLinearPath(data.points)
    return makeMark(
      'path',
      {
        path: newPath,
        stroke: conf.relationLineColor,
        lineCap: 'round',
        lineDash: dashed ? DASH_PATTERN : null,
      },
      { class: 'class__rel-line' },
    )
  }

  /** Creates an edge segment with its layout callback */
  private createEdgeSegment(
    sourceId: string,
    targetId: string,
    minlen: number,
    onLayout: (data: BaseEdgeData) => void,
    edgeName: string,
    extraOptions: Partial<LayoutEdgeOption>,
  ) {
    this.dagreWrapper.g.setEdge(sourceId, targetId, { minlen, onLayout, ...extraOptions }, edgeName)
  }

  protected drawNote(note: Note) {
    const { id, text } = note
    const g = this.dagreWrapper.g

    const targetNodeOption = g.node(note.target)
    if (!targetNodeOption) {
      return
    }

    const group = makeMark(
      'group',
      {
        x: 0,
        y: 0,
      },
      { children: [], class: 'class__note' },
    )
    const { rootMark, conf, theme } = this
    rootMark.children.push(group)

    const fontConfig = { fontSize: conf.fontSize, fontFamily: conf.fontFamily }
    const textDims = calculateTextDimensions(text, fontConfig)
    const rectAttrs = getBaseNote(theme)
    const noteModel = {
      width: textDims.width + 2 * conf.noteMargin,
      height: textDims.height + 2 * conf.noteMargin,
    }
    const noteRect: Rect = {
      type: 'rect',
      class: 'note__bg',
      attrs: rectAttrs,
    }

    const textMark: Text = {
      type: 'text',
      attrs: { fill: conf.noteTextColor, text, textBaseline: 'middle', ...fontConfig },
    }

    let isHorizontal = false
    if (note.placement === 'LEFT_OF') {
      isHorizontal = true
      targetNodeOption.marginl = noteModel.width
    } else if (note.placement === 'RIGHT_OF') {
      isHorizontal = true
      targetNodeOption.marginr = noteModel.width
    }
    if (note.placement === 'TOP_OF') {
      targetNodeOption.margint = noteModel.height
    } else if (note.placement === 'BOTTOM_OF') {
      targetNodeOption.marginb = noteModel.height
    }
    if (isHorizontal) {
      if (targetNodeOption.height! < noteModel.height) {
        targetNodeOption.height = noteModel.height
      }
    } else {
      if (targetNodeOption.width! < noteModel.width) {
        targetNodeOption.width = noteModel.width
      }
    }

    g.setNode(id, {
      mark: group,
      width: noteModel.width,
      height: noteModel.height,

      onLayout: () => {
        const targetNodeData = targetNodeOption as LayoutNode
        const targetNodeStartX = targetNodeData.x - targetNodeData.width / 2
        const targetNodeStartY = targetNodeData.y - targetNodeData.height / 2
        let x = targetNodeStartX
        let y = targetNodeStartY
        if (note.placement === 'LEFT_OF') {
          x = targetNodeStartX - noteModel.width - conf.noteMargin
        } else if (note.placement === 'RIGHT_OF') {
          x = targetNodeData.x + targetNodeData.width / 2 + conf.noteMargin
        }
        if (note.placement === 'TOP_OF') {
          y = targetNodeStartY - noteModel.height - conf.noteMargin
        } else if (note.placement === 'BOTTOM_OF') {
          y = targetNodeStartY + targetNodeData.height + noteModel.height + conf.noteMargin
        }

        safeAssign(textMark.attrs, {
          x: x + conf.noteMargin,
          y: y + textDims.height / 2 + conf.noteMargin,
          width: noteModel.width,
        })

        safeAssign(rectAttrs, {
          x,
          y,
          width: noteModel.width,
          height: noteModel.height,
        })

        const node = g.node(id)
        if (isHorizontal) {
          // node.outerLeft = x
          // node.outerRight = x + noteModel.width
        } else {
          node.outerTop = y
          node.outerBottom = y + noteModel.height
        }
      },
    })
    group.children.push(noteRect, textMark)
  }
}

const RELATION_TO_ARROW_TYPE: Partial<Record<Relation, ArrowType>> = {
  [Relation.INHERITANCE]: 'etriangle',
  [Relation.ASSOCIATION]: 'default',
  [Relation.COMPOSITION]: 'diamond',
  [Relation.AGGREGATION]: 'ediamond',
}

type EntityMarkPair = {
  labelMark: Text
  decorationLine?: Line
}

type EntityMarkRow = {
  labels: Array<string | RowConfig>
  marks: Array<EntityMarkPair>
  labelDims: TSize
  yOffsetStart: number
  yOffsetEnd: number
  isHeader?: boolean
}

type EntitySection = {
  rows: EntityMarkRow[]
}

type RowConfig = {
  label: string
  italic?: boolean
  underline?: boolean
}

/**
 * Handles common logic of drawing an entity/class
 */
class EntityMarkBuilder {
  group: Group = Object.assign(makeEmptyGroup(), {
    class: 'class__entity',
  })
  rowPadding = 8
  /** y offset inside entity */
  curY = 0
  curContentHeight = 0

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
      row = this.addRow(0, [label])
    }
    row.isHeader = true
    last(row.marks).labelMark.attrs.fontWeight = 'bold'
    return row
  }

  addRow(sectionIndex: number, labels: Array<string | RowConfig>) {
    if (!this.sections[sectionIndex]) {
      this.sections[sectionIndex] = {
        rows: [],
      }
    }
    const section = this.sections[sectionIndex]
    const { rowPadding } = this
    const marks: EntityMarkPair[] = []
    const labelDims = { width: 0, height: 0 }
    let labelYOffset = 0
    for (const _l of labels) {
      const labelConfig = typeof _l === 'string' ? { label: _l } : _l
      const label = labelConfig.label
      const fontConfig = this.getFontConfig()
      const dims = calculateTextDimensions(label, fontConfig)
      const textY = this.curY + labelYOffset + rowPadding
      const textAttrs: Text['attrs'] = {
        text: label,
        fill: this.conf.entityTextColor,
        x: 0,
        y: textY,
        textAlign: 'center',
        textBaseline: 'hanging',
        ...dims,
        ...this.getFontConfig(),
      }
      if (labelConfig.italic) {
        Object.assign(textAttrs, {
          fontStyle: 'italic',
        })
      }

      const labelMark = makeMark('text', textAttrs)
      const mark: EntityMarkPair = {
        labelMark,
      }
      if (labelConfig.underline) {
        const lineMark = makeMark('line', {
          x1: 0,
          x2: dims.width,
          y1: textY,
          y2: textY,
          stroke: this.conf.entityTextColor,
          class: 'class-entity__underline',
        })
        mark.decorationLine = lineMark
      }
      const labelYDiff = dims.height + Math.floor(rowPadding / 2)
      labelYOffset += labelYDiff
      marks.push(mark)
      labelDims.width = Math.max(labelDims.width, dims.width)
      labelDims.height += labelYDiff
    }

    const yOffsetStart = this.curY
    const yDiff = labelDims.height + rowPadding
    this.curY += yDiff
    this.curContentHeight += yDiff
    const row: EntityMarkRow = { labels, marks, labelDims, yOffsetStart, yOffsetEnd: this.curY }
    section.rows.push(row)

    for (const pair of marks) {
      this.group.children.push(pair.labelMark)
      if (pair.decorationLine) {
        this.group.children.push(pair.decorationLine)
      }
    }

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
      height: this.curContentHeight + this.rowPadding,
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
        for (const { labelMark, decorationLine } of row.marks) {
          if (!row.isHeader) {
            labelMark.attrs.x += (labelMark.attrs.width - rectSize.width) / 2 + rowPadding
          }
          labelMark.attrs.y += -halfClassHeight + rowPadding / 2
          if (decorationLine) {
            const offsetY = labelMark.attrs.height
            decorationLine.attrs.y1 = labelMark.attrs.y + offsetY
            decorationLine.attrs.y2 = labelMark.attrs.y + offsetY
            const offsetX = -rectSize.width / 2 + rowPadding / 2
            decorationLine.attrs.x1 += offsetX
            decorationLine.attrs.x2 += offsetX
          }
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
        bodySectionYEnd = lastRow.yOffsetEnd + rowPadding - halfClassHeight
      }
    })
    if (typeof bodySectionYStart !== 'undefined' && typeof bodySectionYEnd !== 'undefined') {
      const lineY = bodySectionYStart
      const sectionBg = makeMark(
        'rect',
        {
          width: rectSize.width,
          height: bodySectionYEnd - bodySectionYStart,
          x: -rectSize.width / 2,
          y: lineY,
          fill: this.conf.entityBodyBackground,
          stroke: this.conf.entityBorderColor,
          // opacity: 0.4, // for layout debug
        },
        {
          class: 'class__section-bg',
        },
      )
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
    return getFontConfig(this.conf)
  }
}

export default artist
