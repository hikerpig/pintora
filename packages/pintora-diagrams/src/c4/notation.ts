import {
  calculateTextDimensions,
  createTranslation,
  Group,
  GSymbol,
  IFont,
  Mark,
  safeAssign,
  symbolRegistry,
  TSize,
} from '@pintora/core'
import { makeMark } from '../util/artist-util'
import { EnhancedConf } from '../util/config'
import '../util/symbols'
import { C4Conf } from './config'
import { C4Boundary, C4Element } from './type'

type C4EnhancedConf = EnhancedConf<C4Conf>

export type C4NodeMark = {
  group: Group
  width: number
  height: number
  onLayout(x: number, y: number, width?: number, height?: number): void
}

type C4ElementIcon = {
  symbol: GSymbol
  width: number
  height: number
}

type C4ElementTextRow = {
  text: string
  font: IFont
  gapBefore: number
}

const TEXT_ROW_GAP = 6
const DESCRIPTION_GAP = 14

function getLines(...values: Array<string | undefined>) {
  return values.filter(Boolean) as string[]
}

function elementFill(element: C4Element, conf: C4EnhancedConf) {
  if (element.external) return conf.externalBackground
  return elementKindFill(element, conf)
}

function elementKindFill(element: C4Element, conf: C4EnhancedConf) {
  switch (element.kind) {
    case 'person':
      return conf.personBackground
    case 'system':
      return conf.systemBackground
    case 'container':
      return conf.containerBackground
    case 'component':
      return conf.componentBackground
  }
}

function elementStereotype(element: C4Element) {
  return `<<${element.kind}>>`
}

function makeElementTextRows(element: C4Element, font: IFont): C4ElementTextRow[] {
  const stereotypeFont: IFont = { ...font, fontStyle: 'italic' }
  const headerFont: IFont = { ...font, fontWeight: 'bold' }
  const technologyFont: IFont = { ...font, fontStyle: 'italic' }
  const rows: C4ElementTextRow[] = []

  getLines(elementStereotype(element)).forEach(text => {
    rows.push({ text, font: stereotypeFont, gapBefore: rows.length ? TEXT_ROW_GAP : 0 })
  })
  getLines(element.label).forEach(text => {
    rows.push({ text, font: headerFont, gapBefore: rows.length ? TEXT_ROW_GAP : 0 })
  })
  getLines(element.technology ? `[${element.technology}]` : undefined).forEach(text => {
    rows.push({ text, font: technologyFont, gapBefore: rows.length ? TEXT_ROW_GAP : 0 })
  })
  getLines(element.description).forEach((text, index) => {
    rows.push({ text, font, gapBefore: rows.length ? (index === 0 ? DESCRIPTION_GAP : TEXT_ROW_GAP) : 0 })
  })

  return rows
}

function measureTextRows(rows: C4ElementTextRow[]) {
  return rows.reduce<TSize>(
    (size, row) => {
      const dims = calculateTextDimensions(row.text, row.font)
      return {
        width: Math.max(size.width, dims.width),
        height: size.height + row.gapBefore + dims.height,
      }
    },
    { width: 0, height: 0 },
  )
}

export function makeC4ElementMark(element: C4Element, conf: C4EnhancedConf, font: IFont): C4NodeMark {
  const textRows = makeElementTextRows(element, font)
  const textSize = measureTextRows(textRows)
  const hasIcon = element.shape === 'person' || element.shape === 'database' || element.shape === 'queue'
  const iconWidth = hasIcon ? 28 : 0
  const width = Math.max(textSize.width, 110) + conf.elementPadding * 2 + iconWidth
  const height = Math.max(textSize.height + conf.elementPadding * 2 + 8, 56)
  const fill = elementFill(element, conf)

  const rect = makeMark(
    'rect',
    {
      width,
      height,
      radius: element.shape === 'queue' ? 14 : 4,
      fill,
      stroke: conf.boundaryBorderColor,
      lineWidth: conf.lineWidth,
      lineDash: element.external ? [4, 4] : undefined,
    },
    { class: 'c4__element-rect' },
  )

  const texts = textRows.map(row =>
    makeMark('text', {
      text: row.text,
      fill: conf.textColor,
      textAlign: 'center',
      textBaseline: 'middle',
      ...row.font,
    }),
  )

  const children: Mark[] = [rect, ...texts]
  const icon = createElementIcon(element, conf)
  if (icon) children.push(icon.symbol)

  const group = makeMark(
    'group',
    {},
    { class: `c4__element c4__element--${element.kind}`, itemId: element.itemId, children },
  )

  return {
    group,
    width,
    height,
    onLayout(x, y) {
      safeAssign(rect.attrs, {
        x: x - width / 2,
        y: y - height / 2,
      })

      let cursorY = y - textSize.height / 2
      texts.forEach((text, index) => {
        const row = textRows[index]
        cursorY += row.gapBefore
        const dims = calculateTextDimensions(row.text, row.font)
        cursorY += dims.height / 2
        safeAssign(text.attrs, { x: x + iconWidth / 2, y: cursorY })
        cursorY += dims.height / 2
      })

      if (icon) {
        icon.symbol.mark.matrix = createTranslation(x - width / 2 + conf.elementPadding + icon.width / 2, y)
      }
    },
  }
}

function createElementIcon(element: C4Element, conf: C4EnhancedConf): C4ElementIcon | null {
  if (element.shape === 'person') {
    const width = 22
    const height = 36
    const symbol = symbolRegistry.create('actor', {
      mode: 'icon',
      contentArea: { x: 0, y: 0, width, height },
      attrs: { stroke: conf.textColor, fill: 'none', lineWidth: conf.lineWidth },
    })
    return symbol ? { symbol, width, height } : null
  }

  if (element.shape === 'database') {
    const width = 22
    const height = 30
    const symbol = symbolRegistry.create('database', {
      mode: 'icon',
      contentArea: { x: 0, y: 0, width, height },
      attrs: { stroke: conf.textColor, fill: 'none', lineWidth: conf.lineWidth },
    })
    return symbol ? { symbol, width, height } : null
  }

  if (element.shape === 'queue') {
    const width = 24
    const height = 26
    const symbol = symbolRegistry.create('queue', {
      mode: 'icon',
      contentArea: { x: 0, y: 0, width, height },
      attrs: { stroke: conf.textColor, fill: 'none', lineWidth: conf.lineWidth },
    })
    return symbol ? { symbol, width, height } : null
  }

  return null
}

export function makeC4BoundaryMark(boundary: C4Boundary, conf: C4EnhancedConf, font: IFont): C4NodeMark {
  const labelParts = [boundary.label, boundary.type, boundary.description].filter(Boolean)
  const label = labelParts.join(' - ')
  const labelFont: IFont = { ...font, fontWeight: 'bold' }
  const labelDims = calculateTextDimensions(label, labelFont)
  const rect = makeMark(
    'rect',
    {
      fill: conf.boundaryBackground,
      stroke: conf.boundaryBorderColor,
      lineWidth: conf.lineWidth,
      radius: 4,
    },
    { class: 'c4__boundary-rect' },
  )
  const text = makeMark(
    'text',
    {
      text: label,
      fill: conf.textColor,
      textAlign: 'left',
      textBaseline: 'top',
      ...labelFont,
    },
    { class: 'c4__boundary-label' },
  )
  const group = makeMark(
    'group',
    {},
    { class: `c4__boundary c4__boundary--${boundary.kind}`, itemId: boundary.itemId, children: [rect, text] },
  )

  return {
    group,
    width: labelDims.width + conf.boundaryPadding * 2,
    height: labelDims.height + conf.boundaryPadding * 2,
    onLayout(x, y, layoutWidth, layoutHeight) {
      const width = Math.max(
        layoutWidth || labelDims.width + conf.boundaryPadding * 2,
        labelDims.width + conf.boundaryPadding * 2,
      )
      const height = layoutHeight || labelDims.height + conf.boundaryPadding * 2
      safeAssign(rect.attrs, {
        x: x - width / 2,
        y: y - height / 2,
        width,
        height,
      })
      safeAssign(text.attrs, {
        x: x - width / 2 + conf.boundaryPadding / 2,
        y: y - height / 2 + conf.boundaryPadding / 2,
      })
    },
  }
}
