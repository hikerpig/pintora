import * as fs from 'node:fs'
import * as path from 'node:path'
import { readHarnessArtifacts } from '../summary/artifact-reader'
import { statusToExitCode } from '../exit-codes'
import { buildHarnessSummary } from '../summary/summary-rules'
import { loadCaseRegistry, resolveHarnessWorkspaceRoot } from '../cases/case-registry'

export async function runHarnessSummarizeCase(opts: {
  cwd?: string
  caseId?: string
  inputFile?: string
  artifactsDir: string
  outFile: string
}) {
  const { artifacts, findings, metrics } = readHarnessArtifacts({ artifactsDir: opts.artifactsDir })
  const caseMeta = resolveSummaryCaseMeta(opts)
  const summaryData = buildHarnessSummary({
    run_id: path.basename(opts.artifactsDir),
    case_id: caseMeta?.id ?? null,
    diagram_type: caseMeta?.diagram_type ?? null,
    artifacts,
    metrics,
    findings,
  })

  fs.mkdirSync(path.dirname(opts.outFile), { recursive: true })
  fs.writeFileSync(opts.outFile, JSON.stringify(summaryData, null, 2))

  const exitCode = statusToExitCode(summaryData.status)

  return {
    status: summaryData.status,
    nextAction: summaryData.next_action,
    summary: path.basename(opts.outFile),
    exitCode,
  }
}

function resolveSummaryCaseMeta(opts: { cwd?: string; caseId?: string; inputFile?: string }) {
  if (!opts.cwd) return null

  const registry = loadCaseRegistry(opts.cwd)
  if (opts.caseId) {
    const item = registry.get(opts.caseId)
    if (!item) throw new Error(`Unknown harness case: ${opts.caseId}`)
    return item
  }

  if (!opts.inputFile) return null

  const workspaceRoot = resolveHarnessWorkspaceRoot(opts.cwd)
  const normalizedInputFile = path.normalize(opts.inputFile)
  return (
    Array.from(registry.values()).find(item => {
      const registryRelativePath = path.normalize(item.input_file)
      const harnessRelativePath = path.normalize(path.join('harness/cases', item.input_file))
      const absolutePath = path.normalize(path.join(workspaceRoot, 'harness/cases', item.input_file))
      return [registryRelativePath, harnessRelativePath, absolutePath].includes(normalizedInputFile)
    }) ?? null
  )
}
