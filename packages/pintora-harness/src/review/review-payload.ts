import * as fs from 'node:fs'
import * as path from 'node:path'
import type { SummaryNextAction } from '../contracts/summary'
import type { HarnessStatus } from '../contracts/harness'
import type { HarnessReviewPayload } from './review-contracts'

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function readSummaryFile(filePath: string): Record<string, unknown> {
  const raw = fs.readFileSync(filePath, 'utf8')
  let summary: unknown
  try {
    summary = JSON.parse(raw)
  } catch {
    throw new Error('Invalid summary artifact: expected summary.json to contain valid JSON')
  }
  if (!isObject(summary)) {
    throw new Error('Invalid summary artifact: expected summary.json to contain an object')
  }
  return summary
}

function assertString(value: unknown, message: string): string {
  if (typeof value !== 'string') {
    throw new Error(message)
  }
  return value
}

function assertNullableString(value: unknown, message: string): string | null {
  if (value !== null && typeof value !== 'string') {
    throw new Error(message)
  }
  return value
}

function assertStringArray(value: unknown, message: string): string[] {
  if (!Array.isArray(value) || value.some(item => typeof item !== 'string')) {
    throw new Error(message)
  }
  return value
}

const VALID_STATUS: readonly HarnessStatus[] = ['ok', 'suspicious', 'fail']
const VALID_NEXT_ACTION: readonly SummaryNextAction[] = [
  'done',
  'capture_browser',
  'human_review_or_visual_judge',
  'repair_and_rerun',
]

function assertEnumValue<T extends string>(value: unknown, allowedValues: readonly T[], message: string): T {
  const result = assertString(value, message)
  if (!allowedValues.includes(result as T)) {
    throw new Error(message)
  }
  return result as T
}

type ValidatedSummaryArtifacts = {
  svg: string | null
  browser_png: string | null
  dom_html: string | null
  metrics: string
  findings: string
}

type ValidatedSummary = {
  run_id: string
  case_id: string | null
  diagram_type: string | null
  status: HarnessStatus
  next_action: SummaryNextAction
  top_findings: string[]
  artifacts: ValidatedSummaryArtifacts
  judge_inputs: string[]
}

function isRelativeArtifactPath(value: string) {
  if (value.length === 0) return false
  if (path.isAbsolute(value) || path.posix.isAbsolute(value) || path.win32.isAbsolute(value)) return false
  if (/^[a-zA-Z]:[\\/]/.test(value)) return false
  if (/^(?:\\\\|\/\/)/.test(value)) return false
  return !value.split(/[\\/]+/).includes('..')
}

function isWithinArtifactsDir(rootDir: string, targetPath: string) {
  if (targetPath === rootDir) return true
  const normalizedRoot = rootDir.endsWith(path.sep) ? rootDir : `${rootDir}${path.sep}`
  return targetPath.startsWith(normalizedRoot)
}

function assertExistingArtifact(artifactsDir: string, field: string, relativePath: string): string {
  const resolved = path.join(artifactsDir, relativePath)
  let stat: fs.Stats
  let realPath: string
  try {
    realPath = fs.realpathSync.native(resolved)
    stat = fs.statSync(realPath)
  } catch {
    throw new Error(`Invalid summary artifact: expected ${field} to reference an existing artifact`)
  }
  const artifactsRoot = fs.realpathSync.native(artifactsDir)
  if (!isWithinArtifactsDir(artifactsRoot, realPath)) {
    throw new Error(`Invalid summary artifact: expected ${field} to reference an artifact inside artifactsDir`)
  }
  if (!stat.isFile()) {
    throw new Error(`Invalid summary artifact: expected ${field} to reference an existing artifact file`)
  }
  return relativePath
}

function assertRelativePath(value: unknown, message: string): string {
  const result = assertString(value, message)
  if (!isRelativeArtifactPath(result)) {
    throw new Error(message)
  }
  return result
}

function assertOptionalRelativePath(value: unknown, message: string): string | null {
  const result = assertNullableString(value, message)
  if (result !== null && !isRelativeArtifactPath(result)) {
    throw new Error(message)
  }
  return result
}

function assertRelativePathArray(value: unknown, message: string): string[] {
  if (!Array.isArray(value)) {
    throw new Error(message)
  }
  return value.map(item => assertRelativePath(item, message))
}

function validateSummary(summary: Record<string, unknown>, artifactsDir: string): ValidatedSummary {
  const run_id = assertString(summary.run_id, 'Invalid summary artifact: expected summary.json run_id to be a string')
  const case_id = assertNullableString(
    summary.case_id,
    'Invalid summary artifact: expected summary.json case_id to be a string or null',
  )
  const diagram_type = assertNullableString(
    summary.diagram_type,
    'Invalid summary artifact: expected summary.json diagram_type to be a string or null',
  )
  const status = assertEnumValue(
    summary.status,
    VALID_STATUS,
    'Invalid summary artifact: expected summary.json status to be one of ok, suspicious, fail',
  )
  const next_action = assertEnumValue(
    summary.next_action,
    VALID_NEXT_ACTION,
    'Invalid summary artifact: expected summary.json next_action to be one of done, capture_browser, human_review_or_visual_judge, repair_and_rerun',
  )
  const top_findings = assertStringArray(
    summary.top_findings,
    'Invalid summary artifact: expected summary.json top_findings to contain an array of strings',
  )

  if (!isObject(summary.artifacts)) {
    throw new Error('Invalid summary artifact: expected summary.json artifacts to contain an object')
  }
  const svg = assertOptionalRelativePath(
    summary.artifacts.svg,
    'Invalid summary artifact: expected summary.json artifacts.svg to be a relative path or null',
  )
  if (svg !== null) {
    assertExistingArtifact(artifactsDir, 'summary.json artifacts.svg', svg)
  }
  const browserPng = assertOptionalRelativePath(
    summary.artifacts.browser_png,
    'Invalid summary artifact: expected summary.json artifacts.browser_png to be a relative path or null',
  )
  if (browserPng !== null) {
    assertExistingArtifact(artifactsDir, 'summary.json artifacts.browser_png', browserPng)
  }
  const domHtml = assertOptionalRelativePath(
    summary.artifacts.dom_html,
    'Invalid summary artifact: expected summary.json artifacts.dom_html to be a relative path or null',
  )
  if (domHtml !== null) {
    assertExistingArtifact(artifactsDir, 'summary.json artifacts.dom_html', domHtml)
  }
  const metrics = assertRelativePath(
    summary.artifacts.metrics,
    'Invalid summary artifact: expected summary.json artifacts.metrics to be a relative path',
  )
  assertExistingArtifact(artifactsDir, 'summary.json artifacts.metrics', metrics)
  const findings = assertRelativePath(
    summary.artifacts.findings,
    'Invalid summary artifact: expected summary.json artifacts.findings to be a relative path',
  )
  assertExistingArtifact(artifactsDir, 'summary.json artifacts.findings', findings)

  if (!isObject(summary.judge) || !isObject(summary.judge.inputs)) {
    throw new Error('Invalid summary artifact: expected summary.json judge.inputs.artifacts to contain an array')
  }
  const judgeInputs = assertRelativePathArray(
    summary.judge.inputs.artifacts,
    'Invalid summary artifact: expected summary.json judge.inputs.artifacts to contain an array of relative paths',
  )
  judgeInputs.forEach((artifactPath, index) => {
    assertExistingArtifact(artifactsDir, `summary.json judge.inputs.artifacts[${index}]`, artifactPath)
  })

  return {
    run_id,
    case_id,
    diagram_type,
    status,
    next_action,
    top_findings,
    artifacts: {
      svg,
      browser_png: browserPng,
      dom_html: domHtml,
      metrics,
      findings,
    },
    judge_inputs: judgeInputs,
  }
}

export function buildHarnessReviewPayload(opts: { artifactsDir: string }): HarnessReviewPayload {
  const summaryPath = path.join(opts.artifactsDir, 'summary.json')
  if (!fs.existsSync(summaryPath)) {
    throw new Error('Missing required artifact: summary.json')
  }
  assertExistingArtifact(opts.artifactsDir, 'summary.json', 'summary.json')

  const summary = validateSummary(readSummaryFile(summaryPath), opts.artifactsDir)

  return {
    run_id: summary.run_id,
    case_id: summary.case_id,
    diagram_type: summary.diagram_type,
    status: summary.status,
    next_action: summary.next_action,
    top_findings: summary.top_findings,
    artifacts: {
      svg: summary.artifacts.svg,
      browser_png: summary.artifacts.browser_png,
      dom_html: summary.artifacts.dom_html,
      metrics: summary.artifacts.metrics,
      findings: summary.artifacts.findings,
      summary: 'summary.json',
    },
    judge_inputs: summary.judge_inputs.slice(),
  }
}
