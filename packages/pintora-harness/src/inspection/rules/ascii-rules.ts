import { HarnessFinding } from '../findings'
import { AsciiMetricSnapshot } from '../ascii-metrics'

export function runAsciiRules(metrics: AsciiMetricSnapshot): HarnessFinding[] {
  const findings: HarnessFinding[] = []
  const cornerCounts = Object.values(metrics.boxCornerCounts)
  const hasMissingPlannedRectCorner = metrics.plan
    ? cornerCounts.some(count => count < metrics.plan!.rectOpCount)
    : cornerCounts.some(count => count !== cornerCounts[0])

  if (hasMissingPlannedRectCorner) {
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

  if (metrics.plan?.textRenderMismatchCount) {
    findings.push({
      id: 'ascii-text-render-mismatch',
      severity: 'error',
      message: 'rendered ASCII text does not match planned text cells',
    })
  }

  if (metrics.plan?.textLineConflictCount) {
    findings.push({
      id: 'ascii-text-line-conflict',
      severity: 'warning',
      message: 'text diagram plan places text on top of planned line cells',
    })
  }

  if (metrics.plan?.switchHeadIntrusionCount) {
    findings.push({
      id: 'ascii-switch-head-intrusion',
      severity: 'warning',
      message: 'switch head connector line intrudes into the switch label shape',
    })
  }

  if (metrics.plan?.adjacentLineJoinCount) {
    findings.push({
      id: 'ascii-adjacent-line-join',
      severity: 'warning',
      message: 'ASCII output contains adjacent vertical and horizontal line glyphs where a shared corner is expected',
    })
  }

  if (metrics.plan?.lineCornerMissingCount) {
    findings.push({
      id: 'ascii-line-corner-missing',
      severity: 'warning',
      message: 'text diagram plan expects a solid line corner but the rendered glyph does not join the route',
    })
  }

  return findings
}

export function runErAsciiRules(input: { text: string }): HarnessFinding[] {
  const findings: HarnessFinding[] = []
  if (/\b[A-Za-z0-9_-]+\s+[|}o][|{][-.]{2}[o|][|{]\s+[A-Za-z0-9_-]+\s*:/.test(input.text)) {
    findings.push({
      id: 'er-raw-relationship-legend',
      severity: 'error',
      message: 'ER ASCII output still contains raw relationship DSL instead of visual connector layout',
    })
  }
  if (/\binherit\b/.test(input.text)) {
    findings.push({
      id: 'er-raw-inheritance-legend',
      severity: 'error',
      message: 'ER ASCII output still contains raw inheritance text instead of an ISA connector',
    })
  }
  return findings
}
