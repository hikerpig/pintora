import {
  calculateTextDimensions,
  Group,
  ITheme,
  last,
  makeMark,
  mat3,
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
  makeGroup,
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
import { makeBounds, tryExpandBounds } from '../util/mark-positioner'
import { ClassConf, getConf } from './config'
import { ClassIR, ClassRelation, Note, Relation, TClass } from './db'
import { BaseArtist } from '../util/base-artist'

class ClassArtist extends BaseArtist<ClassIR, ClassConf> {
  customDraw(ir, config) {
    const rootMark = makeGroup()
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
  relationGroupMark = makeGroup()
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
      nodesep: conf.nodesep,
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
    markBuilder.addMemberSections([
      fields.map(member => ({
        label: member.raw,
        italic: member.modifier === 'abstract',
        underline: member.modifier === 'static',
      })),
      methods.map(member => ({
        label: member.raw,
        italic: member.modifier === 'abstract',
        underline: member.modifier === 'static',
      })),
    ])

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

    const group = makeMark('group', {}, { children: [], class: 'class__note' })
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
          node.outerLeft = x
          node.outerRight = x + noteModel.width
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

export type RowConfig = {
  label: string
  italic?: boolean
  underline?: boolean
}

type RowInput = {
  labels: Array<string | RowConfig>
  isHeader?: boolean
}

type RowInputSection = {
  rows: RowInput[]
}

type MeasuredLabel = {
  label: string
  dims: TSize
  italic?: boolean
  underline?: boolean
  bold?: boolean
  localYOffset: number
}

type MeasuredRow = {
  labels: MeasuredLabel[]
  labelDims: TSize
  rowHeight: number
  yOffsetStart: number
  yOffsetEnd: number
  isHeader?: boolean
}

type SectionLayout = {
  rows: MeasuredRow[]
}

type EntityLayoutLabel = {
  text: string
  dims: TSize
  isHeader?: boolean
  italic?: boolean
  underline?: boolean
  bold?: boolean
  x: number
  y: number
  underlineY?: number
}

type EntityLayout = {
  size: TSize
  contentHeight: number
  sections: SectionLayout[]
  sectionSeparatorYs: number[]
  bodySectionBounds?: { y: number; height: number }
  labels: EntityLayoutLabel[]
}

type MeasuredSectionsResult = {
  sections: SectionLayout[]
  contentHeight: number
}

class EntityLayoutEngine {
  static build(sections: RowInputSection[], rowPadding: number, fontConfig: IFont): EntityLayout {
    return new EntityLayoutEngine(rowPadding, fontConfig).build(sections)
  }

  constructor(
    private readonly rowPadding: number,
    private readonly fontConfig: IFont,
  ) {}

  build(sections: RowInputSection[]): EntityLayout {
    const measured = this.measureSections(sections)
    return this.computeEntityLayout(measured)
  }

  private measureRow(row: RowInput): MeasuredRow {
    const labelDims = { width: 0, height: 0 }
    let labelYOffset = 0
    const labels = row.labels.map((_l, index) => {
      const labelConfig = typeof _l === 'string' ? { label: _l } : _l
      const dims = calculateTextDimensions(labelConfig.label, this.fontConfig)
      const localYOffset = labelYOffset
      const labelYDiff = dims.height + Math.floor(this.rowPadding / 2)
      labelYOffset += labelYDiff
      labelDims.width = Math.max(labelDims.width, dims.width)
      labelDims.height += labelYDiff
      return {
        label: labelConfig.label,
        dims,
        italic: labelConfig.italic,
        underline: labelConfig.underline,
        bold: row.isHeader && index === row.labels.length - 1,
        localYOffset,
      }
    })
    const rowHeight = labelDims.height + this.rowPadding
    return { labels, labelDims, rowHeight, yOffsetStart: 0, yOffsetEnd: 0, isHeader: row.isHeader }
  }

  private measureSections(sections: RowInputSection[]): MeasuredSectionsResult {
    let curY = 0
    const measuredSections: SectionLayout[] = []
    sections.forEach((section, sectionIndex) => {
      if (!section) {
        return
      }
      const rows: MeasuredRow[] = []
      for (const row of section.rows) {
        const measured = this.measureRow(row)
        measured.yOffsetStart = curY
        curY += measured.rowHeight
        measured.yOffsetEnd = curY
        rows.push(measured)
      }
      measuredSections[sectionIndex] = { rows }
    })
    return {
      sections: measuredSections,
      contentHeight: curY,
    }
  }

  private computeEntityLayout(measured: MeasuredSectionsResult): EntityLayout {
    const { sections, contentHeight } = measured
    let maxWidth = 0
    sections.forEach(section => {
      if (!section) {
        return
      }
      for (const row of section.rows) {
        maxWidth = Math.max(maxWidth, row.labelDims.width)
      }
    })
    const size = {
      width: maxWidth + this.rowPadding * 2,
      height: contentHeight + this.rowPadding,
    }
    const halfHeight = size.height / 2

    const sectionSeparatorYs: number[] = []
    let bodySectionYStart: number | undefined
    let bodySectionYEnd: number | undefined

    const labels: EntityLayoutLabel[] = []
    const lastSection = last(sections)
    sections.forEach((section, sectionIndex) => {
      if (!section || !section.rows.length) {
        return
      }
      const firstRow = section.rows[0]
      const lastRow = last(section.rows)

      if (sectionIndex === 1) {
        bodySectionYStart = firstRow.yOffsetStart - halfHeight + this.rowPadding
      }

      if (sectionIndex > 0) {
        sectionSeparatorYs.push(firstRow.yOffsetStart - halfHeight + this.rowPadding)
      }

      if (section === lastSection) {
        bodySectionYEnd = lastRow.yOffsetEnd + this.rowPadding - halfHeight
      }

      for (const row of section.rows) {
        for (const label of row.labels) {
          const baseX = row.isHeader ? 0 : (label.dims.width - size.width) / 2 + this.rowPadding
          const baseY = row.yOffsetStart + label.localYOffset + this.rowPadding - halfHeight + this.rowPadding / 2
          labels.push({
            text: label.label,
            dims: label.dims,
            isHeader: row.isHeader,
            italic: label.italic,
            underline: label.underline,
            bold: label.bold,
            x: baseX,
            y: baseY,
            underlineY: label.underline ? baseY + label.dims.height : undefined,
          })
        }
      }
    })

    const bodySectionBounds =
      typeof bodySectionYStart !== 'undefined' && typeof bodySectionYEnd !== 'undefined'
        ? { y: bodySectionYStart, height: bodySectionYEnd - bodySectionYStart }
        : undefined

    return { size, contentHeight, sections, sectionSeparatorYs, bodySectionBounds, labels }
  }
}

/**
 * Handles common logic of drawing an entity/class
 */
class EntityMarkBuilder {
  group: Group = Object.assign(makeGroup(), {
    class: 'class__entity',
  })
  rowPadding = 8

  sections: RowInputSection[] = []
  private layoutCache?: EntityLayout

  constructor(
    public g: LayoutGraph,
    public conf: ClassConf,
  ) {}

  addHeader(label: string, annotation?: string) {
    const row = this.addRow(0, annotation ? [`<<${annotation}>>`, label] : [label])
    row.isHeader = true
    return row
  }

  addMemberSections(memberSections: Array<Array<string | RowConfig>>) {
    for (const memberList of memberSections) {
      const { index } = this.getCurrentSection()
      const nextSectionIndex = index + 1
      if (memberList.length) {
        for (const member of memberList) {
          this.addRow(nextSectionIndex, [member])
        }
        continue
      }
      this.addRow(nextSectionIndex, [''])
    }
  }

  addRow(sectionIndex: number, labels: Array<string | RowConfig>) {
    if (!this.sections[sectionIndex]) {
      this.sections[sectionIndex] = {
        rows: [],
      }
    }
    const section = this.sections[sectionIndex]
    const row: RowInput = { labels }
    section.rows.push(row)
    this.invalidateLayout()
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
    return this.getLayout().size
  }

  onLayout(data: LayoutNode) {
    const layout = this.getLayout()
    this.renderLayout(layout, data)
  }

  getFontConfig() {
    return getFontConfig(this.conf)
  }

  private invalidateLayout() {
    this.layoutCache = undefined
  }

  private getLayout() {
    if (!this.layoutCache) {
      this.layoutCache = EntityLayoutEngine.build(this.sections, this.rowPadding, this.getFontConfig())
    }
    return this.layoutCache
  }

  private renderLayout(layout: EntityLayout, data: LayoutNode) {
    const { size } = layout
    const fontConfig = this.getFontConfig()
    const bgRect = makeMark('rect', {
      ...size,
      x: -size.width / 2,
      y: -size.height / 2,
      fill: this.conf.entityBackground,
      radius: this.conf.entityRadius,
      stroke: this.conf.entityBorderColor,
    })

    const children: Group['children'] = [bgRect]

    if (layout.bodySectionBounds) {
      const sectionBg = makeMark(
        'rect',
        {
          width: size.width,
          height: layout.bodySectionBounds.height,
          x: -size.width / 2,
          y: layout.bodySectionBounds.y,
          fill: this.conf.entityBodyBackground,
          stroke: this.conf.entityBorderColor,
          // opacity: 0.4, // for layout debug
        },
        {
          class: 'class__section-bg',
        },
      )
      children.push(sectionBg)
    }

    for (const label of layout.labels) {
      const attrs: Text['attrs'] = {
        text: label.text,
        fill: this.conf.entityTextColor,
        x: label.x,
        y: label.y,
        textAlign: 'center',
        textBaseline: 'hanging',
        ...label.dims,
        ...fontConfig,
      }
      if (label.italic) {
        attrs.fontStyle = 'italic'
      }
      if (label.bold) {
        attrs.fontWeight = 'bold'
      }
      const labelMark = makeMark('text', attrs)
      children.push(labelMark)
      if (label.underline && label.underlineY !== undefined) {
        children.push(
          makeMark('line', {
            x1: -size.width / 2 + this.rowPadding / 2,
            x2: -size.width / 2 + this.rowPadding / 2 + label.dims.width,
            y1: label.underlineY,
            y2: label.underlineY,
            stroke: this.conf.entityTextColor,
            class: 'class-entity__underline',
          }),
        )
      }
    }

    const separatorYsToDraw =
      layout.bodySectionBounds && layout.sectionSeparatorYs.length > 0
        ? layout.sectionSeparatorYs.slice(1)
        : layout.sectionSeparatorYs

    for (const lineY of separatorYsToDraw) {
      children.push(
        makeMark(
          'line',
          {
            x1: -size.width / 2,
            x2: size.width / 2,
            y1: lineY,
            y2: lineY,
            stroke: this.conf.entityBorderColor,
          },
          { class: 'class-entity__sep-line' },
        ),
      )
    }

    this.group.children = children
    this.group.matrix = mat3.fromTranslation(mat3.create(), [data.x, data.y])
  }
}

export const __testing = {
  EntityLayoutEngine,
  EntityMarkBuilder,
}

export default artist
