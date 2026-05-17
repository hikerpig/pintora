import fs from 'fs'
import path from 'path'
import type { TraceCommandEntry, TraceManifest } from './trace-contracts'

export type WriteInitialTraceAnalysisOptions = {
  outFile: string
  manifest: TraceManifest
  commands: TraceCommandEntry[]
}

export function writeInitialTraceAnalysis(options: WriteInitialTraceAnalysisOptions) {
  const { manifest, commands } = options
  const lines = [
    `# Trace Analysis: ${manifest.run_id}`,
    '',
    `Task: ${manifest.task.title}`,
    '',
    '## Outcomes',
    '',
    `- compile: ${manifest.outcome.compile}`,
    `- unit_tests: ${manifest.outcome.unit_tests}`,
    `- harness: ${manifest.outcome.harness}`,
    `- review: ${manifest.outcome.review}`,
    '',
    '## Commands',
    '',
    ...commands.map(command => {
      const artifacts =
        command.artifact_refs && command.artifact_refs.length > 0 ? ` artifacts=${command.artifact_refs.join(',')}` : ''
      return `- [${command.phase}] ${command.cmd} -> ${command.exit_code}; ${command.summary}${artifacts}`
    }),
    '',
  ]

  fs.mkdirSync(path.dirname(options.outFile), { recursive: true })
  fs.writeFileSync(options.outFile, lines.join('\n'))
}
