import { C4DiagramIR, C4Element, C4ElementTagShape, C4Relationship, C4RelationshipLineStyle } from './type'

export type ResolvedC4ElementStyle = {
  bgColor?: string
  fontColor?: string
  borderColor?: string
  shape?: C4ElementTagShape
  techn?: string
  legendText?: string
}

export type ResolvedC4RelationshipStyle = {
  textColor?: string
  lineColor?: string
  lineStyle?: C4RelationshipLineStyle
  techn?: string
  legendText?: string
}

function mergeElementStyle(
  style: ResolvedC4ElementStyle,
  override: Partial<ResolvedC4ElementStyle>,
): ResolvedC4ElementStyle {
  return {
    ...style,
    bgColor: override.bgColor || style.bgColor,
    fontColor: override.fontColor || style.fontColor,
    borderColor: override.borderColor || style.borderColor,
    shape: override.shape || style.shape,
    techn: override.techn || style.techn,
    legendText: override.legendText || style.legendText,
  }
}

function mergeRelationshipStyle(
  style: ResolvedC4RelationshipStyle,
  override: Partial<ResolvedC4RelationshipStyle>,
): ResolvedC4RelationshipStyle {
  return {
    ...style,
    textColor: override.textColor || style.textColor,
    lineColor: override.lineColor || style.lineColor,
    lineStyle: override.lineStyle || style.lineStyle,
    techn: override.techn || style.techn,
    legendText: override.legendText || style.legendText,
  }
}

export function resolveElementStyle(element: C4Element, ir: C4DiagramIR): ResolvedC4ElementStyle {
  const tagStyle = element.tags.reduce<ResolvedC4ElementStyle>((style, tag) => {
    const tagStyle = ir.elementTags[tag]
    if (!tagStyle) return style
    return mergeElementStyle(style, tagStyle)
  }, {})
  const override = ir.elementStyleOverrides[element.id]
  return override ? mergeElementStyle(tagStyle, override) : tagStyle
}

export function resolveRelationshipStyle(relationship: C4Relationship, ir: C4DiagramIR): ResolvedC4RelationshipStyle {
  const tagStyle = relationship.tags.reduce<ResolvedC4RelationshipStyle>((style, tag) => {
    const tagStyle = ir.relationshipTags[tag]
    if (!tagStyle) return style
    return mergeRelationshipStyle(style, tagStyle)
  }, {})
  const override = ir.relationshipStyleOverrides.find(
    item =>
      (item.source === relationship.source && item.target === relationship.target) ||
      (relationship.bidirectional && item.source === relationship.target && item.target === relationship.source),
  )
  return override ? mergeRelationshipStyle(tagStyle, override) : tagStyle
}

const DASHED_LINE_DASH = [6, 4]
const DOTTED_LINE_DASH = [2, 4]

export function getLineDash(lineStyle?: C4RelationshipLineStyle) {
  switch (lineStyle) {
    case 'dashed':
      return DASHED_LINE_DASH
    case 'dotted':
      return DOTTED_LINE_DASH
    default:
      return undefined
  }
}

export function getLineWidth(defaultLineWidth: number, lineStyle?: C4RelationshipLineStyle) {
  return lineStyle === 'bold' ? defaultLineWidth + 2 : defaultLineWidth
}
