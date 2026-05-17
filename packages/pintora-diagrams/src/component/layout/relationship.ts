import type { LayoutGraph } from '../../util/graph'
import type { ComponentDiagramIR, Relationship } from '../db'

export function getRelationshipEdgeName(relationship: Relationship) {
  return `${relationship.from.name}_${relationship.to.name}_${relationship.message}`
}

export function isChildOfGroup(ir: ComponentDiagramIR, nodeName: string, groupName: string): boolean {
  const group = ir.groups[groupName]
  if (!group) return false

  const isDirectChild = group.children.some(child => 'name' in child && child.name === nodeName)
  if (isDirectChild) return true

  for (const child of group.children) {
    if ('name' in child && child.name in ir.groups) {
      if (isChildOfGroup(ir, nodeName, child.name)) return true
    }
  }

  return false
}

export function shouldSkipRelationship(ir: ComponentDiagramIR, relationship: Relationship) {
  const isFromGroup = relationship.from.type === 'group'
  const isToGroup = relationship.to.type === 'group'
  const isSourceChildOfTarget = isToGroup && isChildOfGroup(ir, relationship.from.name, relationship.to.name)
  const isTargetChildOfSource = isFromGroup && isChildOfGroup(ir, relationship.to.name, relationship.from.name)

  return {
    shouldSkipEdge: isSourceChildOfTarget || isTargetChildOfSource,
    isSourceChildOfTarget,
    isTargetChildOfSource,
  }
}

export function applySkippedEdgeMargin(
  g: LayoutGraph,
  relationship: Relationship,
  skipInfo: ReturnType<typeof shouldSkipRelationship>,
  margin = 20,
  maxMargin = 40,
) {
  if (skipInfo.isSourceChildOfTarget) {
    const childNode = g.node(relationship.from.name)
    if (childNode) childNode.margint = Math.min((childNode.margint || 0) + margin, maxMargin)
  } else if (skipInfo.isTargetChildOfSource) {
    const childNode = g.node(relationship.to.name)
    if (childNode) childNode.margint = Math.min((childNode.margint || 0) + margin, maxMargin)
  }
}

export function maybeAddGroupDummyEdge(g: LayoutGraph, ir: ComponentDiagramIR, relationship: Relationship) {
  const isFromGroup = relationship.from.type === 'group'
  const isToGroup = relationship.to.type === 'group'
  if (!isFromGroup && !isToGroup) return

  if (isToGroup) {
    const toGroup = ir.groups[relationship.to.name]
    const firstChild = toGroup?.children[0]
    if (
      firstChild &&
      'name' in firstChild &&
      firstChild.name !== relationship.from.name &&
      !isChildOfGroup(ir, relationship.from.name, relationship.to.name)
    ) {
      g.setEdge(relationship.from.name, firstChild.name, { isDummyEdge: true })
    }
  } else if (isFromGroup) {
    const fromGroup = ir.groups[relationship.from.name]
    const firstChild = fromGroup?.children[0]
    if (
      firstChild &&
      'name' in firstChild &&
      firstChild.name !== relationship.to.name &&
      !isChildOfGroup(ir, relationship.to.name, relationship.from.name)
    ) {
      g.setEdge(firstChild.name, relationship.to.name, { isDummyEdge: true })
    }
  }
}
