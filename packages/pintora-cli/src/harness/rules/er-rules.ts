import { HarnessFinding } from '../findings'
import { SvgMetricSnapshot } from '../svg-metrics'

export function runErRules(metrics: SvgMetricSnapshot): HarnessFinding[] {
  const findings: HarnessFinding[] = []
  if (metrics.minTextToEdge !== null && metrics.minTextToEdge < 4) {
    findings.push({
      id: 'entity-border-clearance',
      severity: 'warning',
      message: 'text is too close to the diagram edge for an ER case',
    })
  }
  return findings
}
