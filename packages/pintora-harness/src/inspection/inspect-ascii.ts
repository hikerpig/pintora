import * as fs from 'node:fs'
import * as path from 'node:path'
import type { TextDiagramPlan } from '@pintora/core'
import { HarnessStatus } from '../contracts/harness'
import { buildAsciiMetrics } from './ascii-metrics'
import { runAsciiRules, runErAsciiRules } from './rules/ascii-rules'

export async function runHarnessInspectAscii(opts: {
  textFile?: string
  planFile?: string
  caseId?: string
  outDir: string
}) {
  const textFile = opts.textFile ?? path.join(opts.outDir, 'render.txt')
  const planFile = opts.planFile ?? path.join(opts.outDir, 'plan.json')
  const text = fs.readFileSync(textFile, 'utf8')
  const plan = fs.existsSync(planFile) ? readPlan(planFile) : null
  const metrics = buildAsciiMetrics(text, plan)
  const findings = runAsciiRules(metrics)
  if (opts.caseId?.startsWith('er.')) {
    findings.push(...runErAsciiRules({ text }))
  }
  const status: HarnessStatus =
    metrics.lineCount === 0 || metrics.maxDisplayWidth === 0
      ? 'fail'
      : findings.some(finding => finding.severity === 'error')
      ? 'fail'
      : findings.length > 0
      ? 'suspicious'
      : 'ok'

  fs.mkdirSync(opts.outDir, { recursive: true })
  fs.writeFileSync(path.join(opts.outDir, 'ascii-metrics.json'), JSON.stringify(metrics, null, 2))
  fs.writeFileSync(path.join(opts.outDir, 'ascii-findings.json'), JSON.stringify(findings, null, 2))

  return {
    status,
    findingCount: findings.length,
    artifacts: ['ascii-metrics.json', 'ascii-findings.json'],
  }
}

function readPlan(planFile: string): TextDiagramPlan | null {
  const raw = fs.readFileSync(planFile, 'utf8')
  if (!raw.trim() || raw.trim() === 'null') return null
  return JSON.parse(raw) as TextDiagramPlan
}
