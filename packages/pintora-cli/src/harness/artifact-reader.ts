import * as fs from 'node:fs'
import * as path from 'node:path'
import { HarnessFinding } from './findings'
import { SummaryArtifacts } from './summary-contracts'

const OPTIONAL_ARTIFACTS = {
  svg: 'render.svg',
  png: 'render.png',
  browser_png: 'browser.png',
  dom_html: 'dom.html',
} as const

const REQUIRED_ARTIFACTS = {
  metrics: 'metrics.json',
  findings: 'findings.json',
} as const

type SummaryMetricsSnapshot = {
  viewBox: unknown | null
  rootChildCount?: number | null
}

type ReadHarnessArtifactsResult = {
  metrics: SummaryMetricsSnapshot
  findings: Array<Partial<HarnessFinding> & { message?: string }>
  artifacts: SummaryArtifacts
}

function readJsonFile<T>(filePath: string) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8')) as T
}

function readMetricsFile(filePath: string): SummaryMetricsSnapshot {
  const metrics = readJsonFile<unknown>(filePath)
  if (!metrics || typeof metrics !== 'object' || Array.isArray(metrics)) {
    throw new Error('Invalid metrics artifact: expected metrics.json to contain an object')
  }
  return metrics as SummaryMetricsSnapshot
}

function readFindingsFile(filePath: string): Array<Partial<HarnessFinding> & { message?: string }> {
  const findings = readJsonFile<unknown>(filePath)
  if (!Array.isArray(findings)) {
    throw new Error('Invalid findings artifact: expected findings.json to contain an array')
  }
  return findings as Array<Partial<HarnessFinding> & { message?: string }>
}

function readOptionalArtifact(artifactsDir: string, fileName: string) {
  return fs.existsSync(path.join(artifactsDir, fileName)) ? fileName : null
}

export function readHarnessArtifacts(opts: { artifactsDir: string }): ReadHarnessArtifactsResult {
  const metricsPath = path.join(opts.artifactsDir, REQUIRED_ARTIFACTS.metrics)
  const findingsPath = path.join(opts.artifactsDir, REQUIRED_ARTIFACTS.findings)

  if (!fs.existsSync(metricsPath)) {
    throw new Error('Missing required artifact: metrics.json')
  }
  if (!fs.existsSync(findingsPath)) {
    throw new Error('Missing required artifact: findings.json')
  }

  return {
    metrics: readMetricsFile(metricsPath),
    findings: readFindingsFile(findingsPath),
    artifacts: {
      svg: readOptionalArtifact(opts.artifactsDir, OPTIONAL_ARTIFACTS.svg),
      png: readOptionalArtifact(opts.artifactsDir, OPTIONAL_ARTIFACTS.png),
      browser_png: readOptionalArtifact(opts.artifactsDir, OPTIONAL_ARTIFACTS.browser_png),
      dom_html: readOptionalArtifact(opts.artifactsDir, OPTIONAL_ARTIFACTS.dom_html),
      metrics: REQUIRED_ARTIFACTS.metrics,
      findings: REQUIRED_ARTIFACTS.findings,
    },
  }
}
