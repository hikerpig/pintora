import type { CaptureViewport } from '../contracts/browser'
import type { HarnessStatus } from '../contracts/harness'
import type { SummaryNextAction } from '../contracts/summary'

export type RunCaseOptions = {
  cwd: string
  caseId?: string
  inputFile?: string
  artifactsDir: string
  baseUrl?: string
  viewport?: CaptureViewport
  enableCaptureBrowser: boolean
}

export type RunCaseResult = {
  status: HarnessStatus
  nextAction: SummaryNextAction
  artifactsDir: string
  summary: string
  captureBrowserTriggered: boolean
}

export type RunSuiteOptions = {
  cwd: string
  suite: 'smoke' | 'all'
  artifactsDir: string
  baseUrl?: string
  viewport?: CaptureViewport
  enableCaptureBrowser: boolean
  maxConcurrency: number
}

export type RunSuiteCaseResult = {
  caseId: string
  status: HarnessStatus
  summary: string
  captureBrowserTriggered: boolean
}

export type RunSuiteSummary = {
  suite: string
  total: number
  ok: number
  suspicious: number
  fail: number
  captureBrowserTriggeredCount: number
  cases: RunSuiteCaseResult[]
}
