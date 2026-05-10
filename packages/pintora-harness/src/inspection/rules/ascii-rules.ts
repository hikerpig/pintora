import { HarnessFinding } from '../findings'
import { AsciiMetricSnapshot } from '../ascii-metrics'

export function runAsciiRules(metrics: AsciiMetricSnapshot): HarnessFinding[] {
  const findings: HarnessFinding[] = []
  const cornerCounts = Object.values(metrics.boxCornerCounts)

  if (cornerCounts.some(count => count !== cornerCounts[0])) {
    findings.push({
      id: 'ascii-box-corner-mismatch',
      severity: 'error',
      message: 'box corner glyph counts are inconsistent',
    })
  }

  if (metrics.plan?.opOutOfBoundsCount) {
    findings.push({
      id: 'ascii-op-out-of-bounds',
      severity: 'error',
      message: 'text diagram plan contains operations outside its viewport',
    })
  }

  if (metrics.plan?.textLineConflictCount) {
    findings.push({
      id: 'ascii-text-line-conflict',
      severity: 'warning',
      message: 'text diagram plan places text on top of planned line cells',
    })
  }

  return findings
}
