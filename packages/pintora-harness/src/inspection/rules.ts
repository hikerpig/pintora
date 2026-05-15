import { HarnessFinding } from './findings'
import { SvgMetricSnapshot } from './svg-metrics'

const MIN_TEXT_TO_EDGE = 4

const EDGE_CLEARANCE_RULES: Record<string, { id: string; message: string }> = {
  er: {
    id: 'entity-border-clearance',
    message: 'text is too close to the diagram edge for an ER case',
  },
  sequence: {
    id: 'edge-overflow',
    message: 'label is pushed too close to the viewBox edge',
  },
}

export function runHarnessRules(diagramType: string | null | undefined, metrics: SvgMetricSnapshot): HarnessFinding[] {
  const rule = diagramType ? EDGE_CLEARANCE_RULES[diagramType] : undefined
  if (!rule) return []
  if (metrics.minTextToEdge === null || metrics.minTextToEdge >= MIN_TEXT_TO_EDGE) return []
  return [{ id: rule.id, severity: 'warning', message: rule.message }]
}
