export type TraceOutcomeValue =
  | 'pass'
  | 'fail'
  | 'skipped'
  | 'not_run'
  | 'failed_to_start'
  | 'ok'
  | 'suspicious'
  | 'needs_review'
  | 'needs_repair'
  | 'unknown'

export type TraceEnvironment = {
  schema_version: 1
  node: string
  pnpm: string
  platform: NodeJS.Platform
  arch: NodeJS.Architecture
  timezone: string
  cwd: string
  package_manager: string | null
  captured_at: string
}

export type TraceGitState = {
  branch: string
  commit: string
  dirty: boolean
  status_short: string
}

export type TraceCommandPhase = 'build' | 'test' | 'harness'

export type TraceCommandEntry = {
  schema_version: 1
  ts: string
  cmd: string
  cwd: string
  exit_code: number
  duration_ms: number
  phase: TraceCommandPhase
  summary: string
  stdout_excerpt?: string
  stderr_excerpt?: string
  artifact_refs?: string[]
}

export type TraceManifest = {
  schema_version: 1
  run_id: string
  created_at: string
  repo: string
  workspace: string
  agent: {
    name: string
    model: string
    session_id: string | null
  }
  task: {
    title: string
    source: 'user'
    scope: string[]
  }
  git: {
    branch: string
    commit_before: string
    commit_after: string
    dirty_before: boolean
    dirty_after: boolean
    git_before_diff: string | null
    git_after_diff: string | null
  }
  outcome: {
    compile: TraceOutcomeValue
    unit_tests: TraceOutcomeValue
    harness: TraceOutcomeValue
    review: TraceOutcomeValue
  }
  artifacts: {
    task: string | null
    env: string | null
    commands: string | null
    decisions: string | null
    harness: string | null
    analysis: string | null
  }
  incomplete_reason: string | null
}

export type TraceRunOptions = {
  cwd: string
  task: string
  suite: 'smoke' | 'all'
  outDir: string
  runId?: string
  skipCompile?: boolean
  skipTests?: boolean
  enableCaptureBrowser: boolean
  maxConcurrency: number
}

export type TraceRunResult = {
  status: 'completed' | 'failed'
  runId: string
  runDir: string
  manifest: string
  harnessSummary: string | null
}
