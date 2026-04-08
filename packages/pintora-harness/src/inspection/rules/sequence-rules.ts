import { HarnessFinding } from '../findings'
import { SvgMetricSnapshot } from '../svg-metrics'

export function runSequenceRules(metrics: SvgMetricSnapshot): HarnessFinding[] {
  const findings: HarnessFinding[] = []
  if (metrics.minTextToEdge !== null && metrics.minTextToEdge < 4) {
    findings.push({
      id: 'edge-overflow',
      severity: 'warning',
      message: 'label is pushed too close to the viewBox edge',
    })
  }
  return findings
}
