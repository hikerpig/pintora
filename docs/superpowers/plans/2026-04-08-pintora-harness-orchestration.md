# Pintora Harness Orchestration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add `run-case` and `run-suite` orchestration to `@pintora/harness` so one command can execute the full case pipeline and batch multiple registry cases.

**Architecture:** Build orchestration as a thin layer on top of the existing step functions inside `@pintora/harness`. `run-case` owns the pipeline state machine and browser-escalation decision, while `run-suite` only resolves case lists, calls `run-case`, aggregates results, and writes `suite.json`.

**Tech Stack:** TypeScript, yargs, Jest, existing `@pintora/harness` runtime modules

---

## File Structure

### New files

- `packages/pintora-harness/src/orchestration/run-contracts.ts`
  Result types for `run-case` and `run-suite`
- `packages/pintora-harness/src/orchestration/suite-selector.ts`
  Maps suite names to case ids
- `packages/pintora-harness/src/orchestration/case-runner.ts`
  Pure single-case orchestration runtime
- `packages/pintora-harness/src/orchestration/run-case.ts`
  CLI-facing orchestration wrapper for one case
- `packages/pintora-harness/src/orchestration/run-suite.ts`
  CLI-facing orchestration wrapper for suites
- `packages/pintora-harness/src/__tests__/suite-selector.spec.ts`
  Selector tests
- `packages/pintora-harness/src/__tests__/run-case.spec.ts`
  `run-case` orchestration tests with mocked steps
- `packages/pintora-harness/src/__tests__/run-suite.spec.ts`
  `run-suite` aggregation tests with mocked case runner
- `packages/pintora-harness/src/__tests__/run-case.e2e.spec.ts`
  Real integration test for one registry case

### Modified files

- `packages/pintora-harness/src/cli.ts`
  Register `run-case` and `run-suite`
- `packages/pintora-harness/src/index.ts`
  Export orchestration APIs
- `docs/harness/README.md`
  Document orchestration commands

---

### Task 1: Add Orchestration Contracts and Suite Selection

**Files:**
- Create: `packages/pintora-harness/src/orchestration/run-contracts.ts`
- Create: `packages/pintora-harness/src/orchestration/suite-selector.ts`
- Test: `packages/pintora-harness/src/__tests__/suite-selector.spec.ts`

- [ ] **Step 1: Write the failing selector test**

```ts
// packages/pintora-harness/src/__tests__/suite-selector.spec.ts
import { resolveSuiteCaseIds } from '../orchestration/suite-selector'

describe('resolveSuiteCaseIds', () => {
  it('maps smoke to a stable subset of registry cases', () => {
    const caseIds = resolveSuiteCaseIds({
      cwd: process.cwd(),
      suite: 'smoke',
    })

    expect(caseIds).toEqual([
      'er.relationship-spacing-01',
      'sequence.lifeline-label-separation-01',
    ])
  })

  it('maps all to every registry case id', () => {
    const caseIds = resolveSuiteCaseIds({
      cwd: process.cwd(),
      suite: 'all',
    })

    expect(caseIds).toContain('er.relationship-spacing-01')
    expect(caseIds).toContain('sequence.lifeline-label-separation-01')
    expect(caseIds.length).toBeGreaterThanOrEqual(2)
  })

  it('throws for an unknown suite name', () => {
    expect(() =>
      resolveSuiteCaseIds({
        cwd: process.cwd(),
        suite: 'unknown',
      }),
    ).toThrow('Unknown harness suite: unknown')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @pintora/harness exec jest src/__tests__/suite-selector.spec.ts --runInBand`
Expected: FAIL with module-not-found for `../orchestration/suite-selector`

- [ ] **Step 3: Write the contracts file**

```ts
// packages/pintora-harness/src/orchestration/run-contracts.ts
import type { HarnessStatus } from '../contracts/harness'
import type { SummaryNextAction } from '../contracts/summary'
import type { CaptureViewport } from '../contracts/browser'

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
```

- [ ] **Step 4: Write the selector implementation**

```ts
// packages/pintora-harness/src/orchestration/suite-selector.ts
import { loadCaseRegistry } from '../cases/case-registry'

const SMOKE_CASE_IDS = ['er.relationship-spacing-01', 'sequence.lifeline-label-separation-01'] as const

export function resolveSuiteCaseIds(opts: { cwd: string; suite: 'smoke' | 'all' | string }) {
  if (opts.suite === 'smoke') return [...SMOKE_CASE_IDS]

  if (opts.suite === 'all') {
    return Array.from(loadCaseRegistry(opts.cwd).keys()).sort()
  }

  throw new Error(`Unknown harness suite: ${opts.suite}`)
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `pnpm --filter @pintora/harness exec jest src/__tests__/suite-selector.spec.ts --runInBand`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add packages/pintora-harness/src/orchestration/run-contracts.ts \
  packages/pintora-harness/src/orchestration/suite-selector.ts \
  packages/pintora-harness/src/__tests__/suite-selector.spec.ts
git commit -m "feat: add harness orchestration contracts"
```

---

### Task 2: Implement `run-case` Orchestration Runtime

**Files:**
- Create: `packages/pintora-harness/src/orchestration/case-runner.ts`
- Create: `packages/pintora-harness/src/orchestration/run-case.ts`
- Test: `packages/pintora-harness/src/__tests__/run-case.spec.ts`

- [ ] **Step 1: Write the failing orchestration tests**

```ts
// packages/pintora-harness/src/__tests__/run-case.spec.ts
import { runHarnessCase } from '../orchestration/run-case'

const calls: string[] = []

jest.mock('../rendering/render-svg', () => ({
  runHarnessRenderSvg: jest.fn(async () => {
    calls.push('render')
    return { status: 'ok', diagramType: 'er', artifact: 'render.svg' }
  }),
}))

jest.mock('../inspection/inspect-svg', () => ({
  runHarnessInspectSvg: jest.fn(async () => {
    calls.push('inspect')
    return { status: 'suspicious', findingCount: 1, artifacts: ['metrics.json', 'findings.json'] }
  }),
}))

const mockSummaries = [
  { status: 'suspicious', nextAction: 'capture_browser', summary: 'summary.json', exitCode: 10 },
  { status: 'suspicious', nextAction: 'human_review_or_visual_judge', summary: 'summary.json', exitCode: 10 },
]

jest.mock('../summary/summarize-case', () => ({
  runHarnessSummarizeCase: jest.fn(async () => {
    calls.push('summarize')
    return mockSummaries.shift()
  }),
}))

jest.mock('../browser/capture-browser', () => ({
  runHarnessCaptureBrowser: jest.fn(async () => {
    calls.push('capture')
    return { status: 'ok', artifacts: ['browser.png', 'dom.html'], renderer: 'svg-preview' }
  }),
}))

describe('runHarnessCase', () => {
  beforeEach(() => {
    calls.length = 0
  })

  it('runs render, inspect, summarize, capture, summarize when escalation is requested', async () => {
    const result = await runHarnessCase({
      cwd: process.cwd(),
      caseId: 'er.relationship-spacing-01',
      artifactsDir: '/tmp/harness-case',
      enableCaptureBrowser: true,
    })

    expect(calls).toEqual(['render', 'inspect', 'summarize', 'capture', 'summarize'])
    expect(result.captureBrowserTriggered).toBe(true)
    expect(result.nextAction).toBe('human_review_or_visual_judge')
  })

  it('does not run capture-browser when browser capture is disabled', async () => {
    mockSummaries.splice(
      0,
      mockSummaries.length,
      { status: 'suspicious', nextAction: 'capture_browser', summary: 'summary.json', exitCode: 10 },
    )

    const result = await runHarnessCase({
      cwd: process.cwd(),
      caseId: 'er.relationship-spacing-01',
      artifactsDir: '/tmp/harness-case',
      enableCaptureBrowser: false,
    })

    expect(calls).toEqual(['render', 'inspect', 'summarize'])
    expect(result.captureBrowserTriggered).toBe(false)
    expect(result.nextAction).toBe('capture_browser')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @pintora/harness exec jest src/__tests__/run-case.spec.ts --runInBand`
Expected: FAIL with module-not-found for `../orchestration/run-case`

- [ ] **Step 3: Write the pure case runner**

```ts
// packages/pintora-harness/src/orchestration/case-runner.ts
import * as path from 'node:path'
import { runHarnessRenderSvg } from '../rendering/render-svg'
import { runHarnessInspectSvg } from '../inspection/inspect-svg'
import { runHarnessCaptureBrowser } from '../browser/capture-browser'
import { runHarnessSummarizeCase } from '../summary/summarize-case'
import type { RunCaseOptions, RunCaseResult } from './run-contracts'

export async function executeHarnessCase(opts: RunCaseOptions): Promise<RunCaseResult> {
  const renderFile = path.join(opts.artifactsDir, 'render.svg')
  const summaryFile = path.join(opts.artifactsDir, 'summary.json')

  await runHarnessRenderSvg({
    cwd: opts.cwd,
    caseId: opts.caseId,
    inputFile: opts.inputFile,
    outFile: renderFile,
  })

  await runHarnessInspectSvg({
    cwd: opts.cwd,
    svgFile: renderFile,
    caseId: opts.caseId,
    outDir: opts.artifactsDir,
  })

  let summary = await runHarnessSummarizeCase({
    artifactsDir: opts.artifactsDir,
    outFile: summaryFile,
  })

  let captureBrowserTriggered = false
  if (summary.nextAction === 'capture_browser' && opts.enableCaptureBrowser) {
    await runHarnessCaptureBrowser({
      cwd: opts.cwd,
      caseId: opts.caseId,
      inputFile: opts.inputFile,
      outDir: opts.artifactsDir,
      baseUrl: opts.baseUrl,
      viewport: opts.viewport,
    })
    captureBrowserTriggered = true
    summary = await runHarnessSummarizeCase({
      artifactsDir: opts.artifactsDir,
      outFile: summaryFile,
    })
  }

  return {
    status: summary.status,
    nextAction: summary.nextAction,
    artifactsDir: opts.artifactsDir,
    summary: summary.summary,
    captureBrowserTriggered,
  }
}
```

- [ ] **Step 4: Write the public `run-case` wrapper**

```ts
// packages/pintora-harness/src/orchestration/run-case.ts
import { executeHarnessCase } from './case-runner'
import type { RunCaseOptions } from './run-contracts'

export function runHarnessCase(opts: RunCaseOptions) {
  return executeHarnessCase(opts)
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `pnpm --filter @pintora/harness exec jest src/__tests__/run-case.spec.ts --runInBand`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add packages/pintora-harness/src/orchestration/case-runner.ts \
  packages/pintora-harness/src/orchestration/run-case.ts \
  packages/pintora-harness/src/__tests__/run-case.spec.ts
git commit -m "feat: add harness run-case orchestration"
```

---

### Task 3: Wire `run-case` into the CLI and Add a Real Integration Test

**Files:**
- Modify: `packages/pintora-harness/src/cli.ts`
- Modify: `packages/pintora-harness/src/index.ts`
- Test: `packages/pintora-harness/src/__tests__/run-case.e2e.spec.ts`

- [ ] **Step 1: Write the failing integration test**

```ts
// packages/pintora-harness/src/__tests__/run-case.e2e.spec.ts
import * as fs from 'node:fs'
import * as os from 'node:os'
import * as path from 'node:path'
import { runHarnessCase } from '../orchestration/run-case'

describe('runHarnessCase e2e', () => {
  it('runs a registry case through render, inspect, and summary', async () => {
    const artifactsDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pintora-harness-run-case-'))

    const result = await runHarnessCase({
      cwd: process.cwd(),
      caseId: 'er.relationship-spacing-01',
      artifactsDir,
      enableCaptureBrowser: false,
    })

    expect(result.status).toBe('suspicious')
    expect(fs.existsSync(path.join(artifactsDir, 'render.svg'))).toBe(true)
    expect(fs.existsSync(path.join(artifactsDir, 'metrics.json'))).toBe(true)
    expect(fs.existsSync(path.join(artifactsDir, 'findings.json'))).toBe(true)
    expect(fs.existsSync(path.join(artifactsDir, 'summary.json'))).toBe(true)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @pintora/harness exec jest src/__tests__/run-case.e2e.spec.ts --runInBand`
Expected: FAIL until `runHarnessCase` is exported through the current build

- [ ] **Step 3: Add CLI command registration**

```ts
// add inside packages/pintora-harness/src/cli.ts
type RunCaseArgs = {
  case?: string
  input?: string
  'artifacts-dir': string
  'base-url'?: string
  viewport?: string
  'no-capture-browser'?: boolean
}

.command<RunCaseArgs>({
  command: 'run-case',
  describe: 'Run the full harness pipeline for one case or input',
  builder: {
    case: { describe: 'Harness case id', type: 'string' },
    input: { describe: 'Input file path', type: 'string' },
    'artifacts-dir': { describe: 'Target artifact directory', type: 'string', demandOption: true },
    'base-url': { describe: 'Preview base URL', type: 'string' },
    viewport: { describe: 'Viewport formatted as WIDTHxHEIGHT', type: 'string' },
    'no-capture-browser': { describe: 'Disable automatic browser escalation', type: 'boolean', default: false },
  },
  handler: async args => {
    const { runHarnessCase } = require('./orchestration/run-case') as typeof import('./orchestration/run-case')
    const result = await runHarnessCase({
      cwd: CWD,
      caseId: args.case,
      inputFile: args.input,
      artifactsDir: args['artifacts-dir'],
      baseUrl: args['base-url'],
      viewport: parseViewport(args.viewport),
      enableCaptureBrowser: !args['no-capture-browser'],
    })
    process.stdout.write(`${JSON.stringify(result)}\n`)
    process.exitCode = statusToExitCode(result.status)
  },
})
```

- [ ] **Step 4: Export the new API**

```ts
// packages/pintora-harness/src/index.ts
export type { RunCaseOptions, RunCaseResult, RunSuiteOptions, RunSuiteSummary } from './orchestration/run-contracts'
export { runHarnessCase } from './orchestration/run-case'
```

- [ ] **Step 5: Run the integration test**

Run: `pnpm --filter @pintora/harness exec jest src/__tests__/run-case.e2e.spec.ts --runInBand`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add packages/pintora-harness/src/cli.ts \
  packages/pintora-harness/src/index.ts \
  packages/pintora-harness/src/__tests__/run-case.e2e.spec.ts
git commit -m "feat: wire harness run-case command"
```

---

### Task 4: Implement `run-suite` Aggregation and CLI Command

**Files:**
- Create: `packages/pintora-harness/src/orchestration/run-suite.ts`
- Test: `packages/pintora-harness/src/__tests__/run-suite.spec.ts`
- Modify: `packages/pintora-harness/src/cli.ts`
- Modify: `packages/pintora-harness/src/index.ts`

- [ ] **Step 1: Write the failing suite tests**

```ts
// packages/pintora-harness/src/__tests__/run-suite.spec.ts
import * as fs from 'node:fs'
import * as os from 'node:os'
import * as path from 'node:path'
import { runHarnessSuite } from '../orchestration/run-suite'

jest.mock('../orchestration/run-case', () => ({
  runHarnessCase: jest
    .fn()
    .mockResolvedValueOnce({
      status: 'ok',
      nextAction: 'done',
      artifactsDir: '/tmp/one',
      summary: 'summary.json',
      captureBrowserTriggered: false,
    })
    .mockResolvedValueOnce({
      status: 'suspicious',
      nextAction: 'capture_browser',
      artifactsDir: '/tmp/two',
      summary: 'summary.json',
      captureBrowserTriggered: true,
    }),
}))

describe('runHarnessSuite', () => {
  it('aggregates case results and writes suite.json', async () => {
    const artifactsDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pintora-harness-suite-'))

    const result = await runHarnessSuite({
      cwd: process.cwd(),
      suite: 'smoke',
      artifactsDir,
      enableCaptureBrowser: true,
      maxConcurrency: 1,
    })

    expect(result.total).toBe(2)
    expect(result.ok).toBe(1)
    expect(result.suspicious).toBe(1)
    expect(result.fail).toBe(0)
    expect(result.captureBrowserTriggeredCount).toBe(1)
    expect(fs.existsSync(path.join(artifactsDir, 'suite.json'))).toBe(true)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @pintora/harness exec jest src/__tests__/run-suite.spec.ts --runInBand`
Expected: FAIL with module-not-found for `../orchestration/run-suite`

- [ ] **Step 3: Implement suite aggregation**

```ts
// packages/pintora-harness/src/orchestration/run-suite.ts
import * as fs from 'node:fs'
import * as path from 'node:path'
import { runHarnessCase } from './run-case'
import { resolveSuiteCaseIds } from './suite-selector'
import type { RunSuiteOptions, RunSuiteSummary } from './run-contracts'

export async function runHarnessSuite(opts: RunSuiteOptions): Promise<RunSuiteSummary> {
  const caseIds = resolveSuiteCaseIds({ cwd: opts.cwd, suite: opts.suite })
  if (caseIds.length === 0) throw new Error(`Harness suite ${opts.suite} resolved no cases`)

  const cases: RunSuiteSummary['cases'] = []
  for (const caseId of caseIds) {
    const caseArtifactsDir = path.join(opts.artifactsDir, caseId)
    const result = await runHarnessCase({
      cwd: opts.cwd,
      caseId,
      artifactsDir: caseArtifactsDir,
      baseUrl: opts.baseUrl,
      viewport: opts.viewport,
      enableCaptureBrowser: opts.enableCaptureBrowser,
    })
    cases.push({
      caseId,
      status: result.status,
      summary: path.join(caseId, result.summary),
      captureBrowserTriggered: result.captureBrowserTriggered,
    })
  }

  const summary: RunSuiteSummary = {
    suite: opts.suite,
    total: cases.length,
    ok: cases.filter(item => item.status === 'ok').length,
    suspicious: cases.filter(item => item.status === 'suspicious').length,
    fail: cases.filter(item => item.status === 'fail').length,
    captureBrowserTriggeredCount: cases.filter(item => item.captureBrowserTriggered).length,
    cases,
  }

  fs.mkdirSync(opts.artifactsDir, { recursive: true })
  fs.writeFileSync(path.join(opts.artifactsDir, 'suite.json'), JSON.stringify(summary, null, 2))

  return summary
}
```

- [ ] **Step 4: Add the CLI command**

```ts
// add inside packages/pintora-harness/src/cli.ts
type RunSuiteArgs = {
  suite: 'smoke' | 'all'
  'artifacts-dir': string
  'base-url'?: string
  viewport?: string
  'no-capture-browser'?: boolean
  'max-concurrency'?: number
}

.command<RunSuiteArgs>({
  command: 'run-suite',
  describe: 'Run the harness pipeline for a predefined suite of cases',
  builder: {
    suite: { describe: 'Harness suite name', type: 'string', demandOption: true },
    'artifacts-dir': { describe: 'Target suite artifact directory', type: 'string', demandOption: true },
    'base-url': { describe: 'Preview base URL', type: 'string' },
    viewport: { describe: 'Viewport formatted as WIDTHxHEIGHT', type: 'string' },
    'no-capture-browser': { describe: 'Disable automatic browser escalation', type: 'boolean', default: false },
    'max-concurrency': { describe: 'Maximum parallel cases', type: 'number', default: 1 },
  },
  handler: async args => {
    const { runHarnessSuite } = require('./orchestration/run-suite') as typeof import('./orchestration/run-suite')
    const result = await runHarnessSuite({
      cwd: CWD,
      suite: args.suite,
      artifactsDir: args['artifacts-dir'],
      baseUrl: args['base-url'],
      viewport: parseViewport(args.viewport),
      enableCaptureBrowser: !args['no-capture-browser'],
      maxConcurrency: args['max-concurrency'] || 1,
    })
    process.stdout.write(`${JSON.stringify(result)}\n`)
    process.exitCode = result.fail > 0 ? 20 : result.suspicious > 0 ? 10 : 0
  },
})
```

- [ ] **Step 5: Export the suite API and run the suite test**

```ts
// packages/pintora-harness/src/index.ts
export { runHarnessSuite } from './orchestration/run-suite'
```

Run: `pnpm --filter @pintora/harness exec jest src/__tests__/run-suite.spec.ts --runInBand`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add packages/pintora-harness/src/orchestration/run-suite.ts \
  packages/pintora-harness/src/cli.ts \
  packages/pintora-harness/src/index.ts \
  packages/pintora-harness/src/__tests__/run-suite.spec.ts
git commit -m "feat: add harness run-suite orchestration"
```

---

### Task 5: Document Orchestration Commands and Run Final Verification

**Files:**
- Modify: `docs/harness/README.md`
- Test: `packages/pintora-harness/src/__tests__/run-case.e2e.spec.ts`
- Test: `packages/pintora-harness/src/__tests__/run-case.spec.ts`
- Test: `packages/pintora-harness/src/__tests__/run-suite.spec.ts`
- Test: `packages/pintora-harness/src/__tests__/cli.spec.ts`

- [ ] **Step 1: Update harness documentation**

```md
## Orchestration

- `pintora-harness run-case --case er.relationship-spacing-01 --artifacts-dir artifacts/harness/dev/er.relationship-spacing-01`
- `pintora-harness run-suite --suite smoke --artifacts-dir artifacts/harness/smoke-run`

`run-case` executes `render-svg -> inspect-svg -> summarize-case` and automatically upgrades to `capture-browser` when `summary.next_action` is `capture_browser`, unless `--no-capture-browser` is passed.

`run-suite` runs a predefined suite of registry cases and writes `suite.json` at the suite root.
```

- [ ] **Step 2: Run focused orchestration tests**

Run: `pnpm --filter @pintora/harness exec jest src/__tests__/suite-selector.spec.ts src/__tests__/run-case.spec.ts src/__tests__/run-suite.spec.ts src/__tests__/run-case.e2e.spec.ts src/__tests__/cli.spec.ts --runInBand`
Expected: PASS

- [ ] **Step 3: Run full harness test suite**

Run: `pnpm --filter @pintora/harness test -- --runInBand`
Expected: PASS with all harness suites green

- [ ] **Step 4: Compile and smoke the CLI**

Run: `pnpm --filter @pintora/harness compile`
Expected: PASS

Run: `node packages/pintora-harness/lib/cli.js run-case --case er.relationship-spacing-01 --artifacts-dir artifacts/harness/manual-run-case --no-capture-browser`
Expected: JSON output with `status`, `nextAction`, `summary`, and `captureBrowserTriggered:false`

Run: `node packages/pintora-harness/lib/cli.js run-suite --suite smoke --artifacts-dir artifacts/harness/manual-run-suite --no-capture-browser`
Expected: JSON output with `total`, `ok`, `suspicious`, `fail`, and `cases`

- [ ] **Step 5: Commit**

```bash
git add docs/harness/README.md \
  packages/pintora-harness/src/__tests__/suite-selector.spec.ts \
  packages/pintora-harness/src/__tests__/run-case.spec.ts \
  packages/pintora-harness/src/__tests__/run-suite.spec.ts \
  packages/pintora-harness/src/__tests__/run-case.e2e.spec.ts \
  packages/pintora-harness/src/cli.ts \
  packages/pintora-harness/src/index.ts \
  packages/pintora-harness/src/orchestration
git commit -m "docs: add harness orchestration usage"
```

---

## Final Verification Checklist

- [ ] `pnpm --filter @pintora/harness exec jest src/__tests__/suite-selector.spec.ts src/__tests__/run-case.spec.ts src/__tests__/run-suite.spec.ts src/__tests__/run-case.e2e.spec.ts --runInBand`
- [ ] `pnpm --filter @pintora/harness test -- --runInBand`
- [ ] `pnpm --filter @pintora/harness compile`
- [ ] `node packages/pintora-harness/lib/cli.js run-case --case er.relationship-spacing-01 --artifacts-dir artifacts/harness/manual-run-case --no-capture-browser`
- [ ] `node packages/pintora-harness/lib/cli.js run-suite --suite smoke --artifacts-dir artifacts/harness/manual-run-suite --no-capture-browser`

