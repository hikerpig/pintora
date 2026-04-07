import * as fs from 'node:fs'
import * as path from 'node:path'
import type { HarnessReviewAdapter, HarnessReviewAdapterInput } from '../review-contracts'
import { writePackDirPayload } from './pack-dir'

function formatValue(value: string | null) {
  return value === null ? 'null' : value
}

function buildReadme(input: HarnessReviewAdapterInput) {
  const lines = [
    '# Manual Review Pack',
    '',
    '## Summary status',
    `- Status: ${input.payload.status}`,
    `- Next action: ${input.payload.next_action}`,
    '',
    '## Artifacts to check',
    `- svg: ${formatValue(input.payload.artifacts.svg)}`,
    `- browser_png: ${formatValue(input.payload.artifacts.browser_png)}`,
    `- dom_html: ${formatValue(input.payload.artifacts.dom_html)}`,
    `- metrics: ${input.payload.artifacts.metrics}`,
    `- findings: ${input.payload.artifacts.findings}`,
    `- summary: ${input.payload.artifacts.summary}`,
    '',
    '## Top findings',
    ...(input.payload.top_findings.length > 0
      ? input.payload.top_findings.map(finding => `- ${finding}`)
      : ['- (none)']),
    '',
    '## Judge inputs',
    ...(input.payload.judge_inputs.length > 0
      ? input.payload.judge_inputs.map(artifact => `- ${artifact}`)
      : ['- (none)']),
    '',
    'Next task: make a review judgment, not another pipeline run.',
    '',
  ]

  return lines.join('\n')
}

export const manualReviewPackAdapter: HarnessReviewAdapter = {
  name: 'manual-review-pack',
  async run(input) {
    const packDir = input.packDir ?? path.resolve(input.artifactsDir, 'review-pack')
    const { resolvedPackDir, relativePackDir } = writePackDirPayload({
      artifactsDir: input.artifactsDir,
      packDir,
      payload: input.payload,
    })
    fs.writeFileSync(path.join(resolvedPackDir, 'README.md'), buildReadme(input))

    return {
      adapter: 'manual-review-pack',
      status: 'completed',
      verdict: 'needs_human_review',
      confidence: null,
      summary: 'browser evidence and structural findings require human judgment',
      artifacts: {
        pack_dir: relativePackDir,
      },
    }
  },
}
