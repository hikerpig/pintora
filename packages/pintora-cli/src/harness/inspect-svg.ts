import * as fs from 'node:fs'
import * as path from 'node:path'
import { loadCaseRegistry } from './case-registry'
import { HarnessStatus } from './contracts'
import { runErRules } from './rules/er-rules'
import { runSequenceRules } from './rules/sequence-rules'
import { parseSvg } from './svg-parse'
import { buildSvgMetrics } from './svg-metrics'

export async function runHarnessInspectSvg(opts: {
  cwd: string
  svgFile: string
  caseId?: string
  outDir: string
}) {
  const svgText = fs.readFileSync(opts.svgFile, 'utf8')
  const { root } = parseSvg(svgText)
  const registryItem = opts.caseId ? loadCaseRegistry(opts.cwd).get(opts.caseId) : null
  const metrics = buildSvgMetrics(root)

  const findings =
    registryItem?.diagram_type === 'er'
      ? runErRules(metrics)
      : registryItem?.diagram_type === 'sequence'
        ? runSequenceRules(metrics)
        : []

  const status: HarnessStatus =
    !metrics.viewBox || root.childElementCount === 0 ? 'fail' : findings.length > 0 ? 'suspicious' : 'ok'

  fs.mkdirSync(opts.outDir, { recursive: true })
  fs.writeFileSync(path.join(opts.outDir, 'metrics.json'), JSON.stringify(metrics, null, 2))
  fs.writeFileSync(path.join(opts.outDir, 'findings.json'), JSON.stringify(findings, null, 2))

  return {
    status,
    findingCount: findings.length,
    artifacts: ['metrics.json', 'findings.json'],
  }
}
