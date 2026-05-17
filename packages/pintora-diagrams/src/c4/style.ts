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

export function resolveElementStyle(element: C4Element, ir: C4DiagramIR): ResolvedC4ElementStyle {
  return element.tags.reduce<ResolvedC4ElementStyle>((style, tag) => {
    const tagStyle = ir.elementTags[tag]
    if (!tagStyle) return style
    return {
      ...style,
      bgColor: tagStyle.bgColor || style.bgColor,
      fontColor: tagStyle.fontColor || style.fontColor,
      borderColor: tagStyle.borderColor || style.borderColor,
      shape: tagStyle.shape || style.shape,
      techn: tagStyle.techn || style.techn,
      legendText: tagStyle.legendText || style.legendText,
    }
  }, {})
}

export function resolveRelationshipStyle(relationship: C4Relationship, ir: C4DiagramIR): ResolvedC4RelationshipStyle {
  return relationship.tags.reduce<ResolvedC4RelationshipStyle>((style, tag) => {
    const tagStyle = ir.relationshipTags[tag]
    if (!tagStyle) return style
    return {
      ...style,
      textColor: tagStyle.textColor || style.textColor,
      lineColor: tagStyle.lineColor || style.lineColor,
      lineStyle: tagStyle.lineStyle || style.lineStyle,
      techn: tagStyle.techn || style.techn,
      legendText: tagStyle.legendText || style.legendText,
    }
  }, {})
}

export function getLineDash(lineStyle?: C4RelationshipLineStyle) {
  switch (lineStyle) {
    case 'dashed':
      return [6, 4]
    case 'dotted':
      return [2, 4]
    default:
      return undefined
  }
}

export function getLineWidth(defaultLineWidth: number, lineStyle?: C4RelationshipLineStyle) {
  return lineStyle === 'bold' ? defaultLineWidth + 2 : defaultLineWidth
}
