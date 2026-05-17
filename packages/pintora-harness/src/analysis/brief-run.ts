import * as fs from 'node:fs'
import * as path from 'node:path'
import { readChangedPathsFromDiff, readTraceRunRecord } from './run-reader'

export async function runHarnessBriefRun(opts: { runDir: string; outFile: string }) {
  const record = readTraceRunRecord(opts.runDir)
  const brief = buildRepairBrief(record, opts.runDir)

  fs.mkdirSync(path.dirname(opts.outFile), { recursive: true })
  fs.writeFileSync(opts.outFile, brief)

  return {
    status: 'completed' as const,
    brief: path.basename(opts.outFile),
  }
}

function buildRepairBrief(record: ReturnType<typeof readTraceRunRecord>, runDir: string) {
  const manifest = record.manifest
  const changedPaths = manifest?.git?.git_after_diff
    ? readChangedPathsFromDiff(path.join(runDir, manifest.git.git_after_diff))
    : []
  const nonOkCases = record.cases.filter(item => item.status !== 'ok')
  const predictions = record.decisions.filter(item => item.kind === 'prediction')
  const lines = [
    `# Repair Brief: ${record.runId}`,
    '',
    `Task: ${manifest?.task?.title || 'unknown task'}`,
    '',
    '## Outcomes',
    '',
    `- compile: ${manifest?.outcome?.compile || 'unknown'}`,
    `- unit_tests: ${manifest?.outcome?.unit_tests || 'unknown'}`,
    `- harness: ${manifest?.outcome?.harness || 'unknown'}`,
    `- review: ${manifest?.outcome?.review || 'unknown'}`,
    '',
    '## Commands',
    '',
    ...record.commands.map(
      command => `- ${command.phase}: ${command.cmd} -> ${command.exit_code} (${command.summary})`,
    ),
    '',
    '## Cases Needing Attention',
    '',
  ]

  if (nonOkCases.length === 0) {
    lines.push('- None')
  } else {
    for (const item of nonOkCases) {
      const summary = item.summary
      lines.push(
        `- ${item.caseId}: ${item.status}`,
        `  - failure_signature: ${summary?.failure_signature || 'unknown'}`,
        `  - suspected_component: ${summary?.suspected_component || 'unknown'}`,
        `  - next_action: ${summary?.next_action || 'unknown'}`,
      )
      for (const finding of summary?.top_findings || []) {
        lines.push(`  - finding: ${finding}`)
      }
    }
  }

  lines.push('', '## Changed Paths', '')
  if (changedPaths.length === 0) {
    lines.push('- None recorded')
  } else {
    lines.push(...changedPaths.map(changedPath => `- ${changedPath}`))
  }

  lines.push('', '## Decision Observability', '')
  if (predictions.length === 0) {
    lines.push('- No predictions recorded')
  } else {
    for (const prediction of predictions) {
      lines.push(`- ${prediction.id || 'prediction'}: ${prediction.claim || 'no claim recorded'}`)
      if (prediction.expected_improve?.length)
        lines.push(`  - expected_improve: ${prediction.expected_improve.join(', ')}`)
      if (prediction.expected_unchanged?.length) {
        lines.push(`  - expected_unchanged: ${prediction.expected_unchanged.join(', ')}`)
      }
    }
  }

  lines.push(
    '',
    '## Recommended Next Steps',
    '',
    '- Inspect each non-ok case summary and rendered SVG.',
    '- Repair the suspected component only when the finding matches the code path.',
    '- Rerun `trace-run` after changes and compare the new manifest and case summaries.',
    '',
  )

  return `${lines.join('\n')}`
}
