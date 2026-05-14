import * as fs from 'node:fs'
import * as path from 'node:path'
import { loadCaseRegistry } from '../cases/case-registry'
import { runHarnessRules } from './rules'
import { withSvgRoot } from '../inspection/svg-parse'
import { buildSvgMetrics } from '../inspection/svg-metrics'
import { deriveStatus } from '../summary/summary-rules'

export async function runHarnessInspectSvg(opts: {
  cwd: string
  svgFile: string
  caseId?: string
  outDir: string
}) {
  const svgText = fs.readFileSync(opts.svgFile, 'utf8')
  const registryItem = opts.caseId ? loadCaseRegistry(opts.cwd).get(opts.caseId) : null
  if (opts.caseId && !registryItem) {
    throw new Error(`Unknown harness case: ${opts.caseId}`)
  }
  const metrics = withSvgRoot(svgText, buildSvgMetrics)
  const findings = runHarnessRules(registryItem?.diagram_type, metrics)
  const status = deriveStatus(metrics.viewBox, metrics.rootChildCount, findings)

  fs.mkdirSync(opts.outDir, { recursive: true })
  fs.writeFileSync(path.join(opts.outDir, 'metrics.json'), JSON.stringify(metrics, null, 2))
  fs.writeFileSync(path.join(opts.outDir, 'findings.json'), JSON.stringify(findings, null, 2))

  return {
    status,
    findingCount: findings.length,
    artifacts: ['metrics.json', 'findings.json'],
  }
}
