# Pintora Harness Summarize Case Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add `pintora harness summarize-case` so the harness can turn one artifacts directory into a stable `summary.json` with status, scores, top findings, and a rule-based `next_action`.

**Architecture:** Keep the command surface inside `@pintora/cli`, but isolate reading, rule evaluation, and summary writing into dedicated modules. The command should only read an artifacts directory, assemble a rule-driven summary, write `summary.json`, and map the existing harness status to stdout and exit codes.

**Tech Stack:** TypeScript, existing harness status contracts, existing exit code mapping, Jest

---

### File Structure

**Create:**
- `packages/pintora-cli/src/harness/summary-contracts.ts`
- `packages/pintora-cli/src/harness/artifact-reader.ts`
- `packages/pintora-cli/src/harness/summary-rules.ts`
- `packages/pintora-cli/src/harness/summarize-case.ts`
- `packages/pintora-cli/src/__tests__/harness/artifact-reader.spec.ts`
- `packages/pintora-cli/src/__tests__/harness/summary-rules.spec.ts`
- `packages/pintora-cli/src/__tests__/harness/summarize-case.spec.ts`

**Modify:**
- `packages/pintora-cli/src/cli.ts`
- `docs/harness/README.md`

### Design Notes Locked In

- `summarize-case` only accepts `--artifacts <dir>` as its source of truth
- `metrics.json` and `findings.json` are required
- `summary.json` includes `next_action`
- `next_action` is rule-driven for now
- judge integration is represented only as reserved fields
- relative artifact paths should be stored in `summary.json`
- status reuse must go through existing `HarnessStatus` and `statusToExitCode`

### Task 1: Add Summary Contracts and Artifact Reader

**Files:**
- Create: `packages/pintora-cli/src/harness/summary-contracts.ts`
- Create: `packages/pintora-cli/src/harness/artifact-reader.ts`
- Test: `packages/pintora-cli/src/__tests__/harness/artifact-reader.spec.ts`

- [ ] **Step 1: Write the failing artifact reader tests**

```ts
// packages/pintora-cli/src/__tests__/harness/artifact-reader.spec.ts
import * as fs from 'node:fs'
import * as os from 'node:os'
import * as path from 'node:path'
import { readHarnessArtifacts } from '../../harness/artifact-reader'

describe('readHarnessArtifacts', () => {
  it('reads required metrics and findings and records optional artifacts', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'pintora-summary-artifacts-'))
    fs.writeFileSync(path.join(dir, 'metrics.json'), JSON.stringify({ viewBox: { x: 0, y: 0, width: 100, height: 80 } }))
    fs.writeFileSync(path.join(dir, 'findings.json'), JSON.stringify([]))
    fs.writeFileSync(path.join(dir, 'render.svg'), '<svg></svg>')
    fs.writeFileSync(path.join(dir, 'browser.png'), 'png')

    const result = readHarnessArtifacts({ artifactsDir: dir })

    expect(result.artifacts.metrics).toBe('metrics.json')
    expect(result.artifacts.findings).toBe('findings.json')
    expect(result.artifacts.svg).toBe('render.svg')
    expect(result.artifacts.browser_png).toBe('browser.png')
  })

  it('throws when findings.json is missing', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'pintora-summary-artifacts-'))
    fs.writeFileSync(path.join(dir, 'metrics.json'), JSON.stringify({}))

    expect(() => readHarnessArtifacts({ artifactsDir: dir })).toThrow('Missing required artifact: findings.json')
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm --filter @pintora/cli exec jest src/__tests__/harness/artifact-reader.spec.ts --runInBand`

Expected: FAIL with module-not-found for `../../harness/artifact-reader`

- [ ] **Step 3: Add summary contracts**

```ts
// packages/pintora-cli/src/harness/summary-contracts.ts
import { HarnessStatus } from './contracts'

export type SummaryNextAction =
  | 'done'
  | 'capture_browser'
  | 'human_review_or_visual_judge'
  | 'repair_and_rerun'

export type SummaryArtifacts = {
  svg: string | null
  png: string | null
  browser_png: string | null
  dom_html: string | null
  metrics: string
  findings: string
}

export type SummaryScores = {
  legibility: number | null
  structural_clarity: number | null
  spatial_balance: number | null
  visual_taste: number | null
}

export type HarnessSummary = {
  run_id: string
  case_id: string | null
  diagram_type: string | null
  status: HarnessStatus
  pipeline: string[]
  artifacts: SummaryArtifacts
  scores: SummaryScores
  top_findings: string[]
  next_action: SummaryNextAction
  judge: {
    required: boolean
    inputs: {
      artifacts: string[]
    }
  }
}
```

- [ ] **Step 4: Implement the artifact reader**

```ts
// packages/pintora-cli/src/harness/artifact-reader.ts
import * as fs from 'node:fs'
import * as path from 'node:path'

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

export function readHarnessArtifacts(opts: { artifactsDir: string }) {
  const metricsPath = path.join(opts.artifactsDir, REQUIRED_ARTIFACTS.metrics)
  const findingsPath = path.join(opts.artifactsDir, REQUIRED_ARTIFACTS.findings)
  if (!fs.existsSync(metricsPath)) throw new Error('Missing required artifact: metrics.json')
  if (!fs.existsSync(findingsPath)) throw new Error('Missing required artifact: findings.json')

  return {
    metrics: JSON.parse(fs.readFileSync(metricsPath, 'utf8')),
    findings: JSON.parse(fs.readFileSync(findingsPath, 'utf8')),
    artifacts: {
      svg: fs.existsSync(path.join(opts.artifactsDir, OPTIONAL_ARTIFACTS.svg)) ? OPTIONAL_ARTIFACTS.svg : null,
      png: fs.existsSync(path.join(opts.artifactsDir, OPTIONAL_ARTIFACTS.png)) ? OPTIONAL_ARTIFACTS.png : null,
      browser_png: fs.existsSync(path.join(opts.artifactsDir, OPTIONAL_ARTIFACTS.browser_png))
        ? OPTIONAL_ARTIFACTS.browser_png
        : null,
      dom_html: fs.existsSync(path.join(opts.artifactsDir, OPTIONAL_ARTIFACTS.dom_html))
        ? OPTIONAL_ARTIFACTS.dom_html
        : null,
      metrics: REQUIRED_ARTIFACTS.metrics,
      findings: REQUIRED_ARTIFACTS.findings,
    },
  }
}
```

- [ ] **Step 5: Run the artifact reader test to verify it passes**

Run: `pnpm --filter @pintora/cli exec jest src/__tests__/harness/artifact-reader.spec.ts --runInBand`

Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add packages/pintora-cli/src/harness/summary-contracts.ts packages/pintora-cli/src/harness/artifact-reader.ts packages/pintora-cli/src/__tests__/harness/artifact-reader.spec.ts
git commit -m "feat: add harness summary contracts and artifact reader"
```

### Task 2: Implement Summary Rules for Status, Scores, and `next_action`

**Files:**
- Create: `packages/pintora-cli/src/harness/summary-rules.ts`
- Test: `packages/pintora-cli/src/__tests__/harness/summary-rules.spec.ts`

- [ ] **Step 1: Write the failing summary rules tests**

```ts
// packages/pintora-cli/src/__tests__/harness/summary-rules.spec.ts
import { buildHarnessSummary } from '../../harness/summary-rules'

describe('buildHarnessSummary', () => {
  it('returns done for ok results without findings', () => {
    const summary = buildHarnessSummary({
      runId: 'run-ok',
      artifacts: {
        svg: 'render.svg',
        png: null,
        browser_png: null,
        dom_html: null,
        metrics: 'metrics.json',
        findings: 'findings.json',
      },
      metrics: { viewBox: { x: 0, y: 0, width: 100, height: 80 } },
      findings: [],
    })

    expect(summary.status).toBe('ok')
    expect(summary.next_action).toBe('done')
  })

  it('returns capture_browser when suspicious without browser evidence', () => {
    const summary = buildHarnessSummary({
      runId: 'run-suspicious',
      artifacts: {
        svg: 'render.svg',
        png: null,
        browser_png: null,
        dom_html: null,
        metrics: 'metrics.json',
        findings: 'findings.json',
      },
      metrics: { viewBox: { x: 0, y: 0, width: 100, height: 80 } },
      findings: [{ id: 'edge-overflow', severity: 'warning', message: 'too close to edge' }],
    })

    expect(summary.status).toBe('suspicious')
    expect(summary.next_action).toBe('capture_browser')
  })

  it('returns human_review_or_visual_judge when suspicious with browser evidence', () => {
    const summary = buildHarnessSummary({
      runId: 'run-browser',
      artifacts: {
        svg: 'render.svg',
        png: null,
        browser_png: 'browser.png',
        dom_html: 'dom.html',
        metrics: 'metrics.json',
        findings: 'findings.json',
      },
      metrics: { viewBox: { x: 0, y: 0, width: 100, height: 80 } },
      findings: [{ id: 'edge-overflow', severity: 'warning', message: 'too close to edge' }],
    })

    expect(summary.next_action).toBe('human_review_or_visual_judge')
    expect(summary.judge.required).toBe(true)
  })

  it('returns repair_and_rerun when metrics are structurally invalid', () => {
    const summary = buildHarnessSummary({
      runId: 'run-fail',
      artifacts: {
        svg: null,
        png: null,
        browser_png: null,
        dom_html: null,
        metrics: 'metrics.json',
        findings: 'findings.json',
      },
      metrics: { viewBox: null },
      findings: [],
    })

    expect(summary.status).toBe('fail')
    expect(summary.next_action).toBe('repair_and_rerun')
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm --filter @pintora/cli exec jest src/__tests__/harness/summary-rules.spec.ts --runInBand`

Expected: FAIL with module-not-found for `../../harness/summary-rules`

- [ ] **Step 3: Implement summary rules**

```ts
// packages/pintora-cli/src/harness/summary-rules.ts
import { HarnessStatus } from './contracts'
import { HarnessSummary, SummaryArtifacts, SummaryScores } from './summary-contracts'

function deriveStatus(metrics: any, findings: any[]): HarnessStatus {
  if (!metrics?.viewBox) return 'fail'
  if (findings.length > 0) return 'suspicious'
  return 'ok'
}

function deriveNextAction(status: HarnessStatus, artifacts: SummaryArtifacts) {
  if (status === 'ok') return 'done'
  if (status === 'fail') return 'repair_and_rerun'
  if (!artifacts.browser_png) return 'capture_browser'
  return 'human_review_or_visual_judge'
}

function deriveScores(status: HarnessStatus, findings: any[]): SummaryScores {
  if (status === 'fail') {
    return {
      legibility: 0,
      structural_clarity: 0,
      spatial_balance: null,
      visual_taste: null,
    }
  }
  if (findings.length === 0) {
    return {
      legibility: 3,
      structural_clarity: 3,
      spatial_balance: 3,
      visual_taste: null,
    }
  }
  return {
    legibility: 2,
    structural_clarity: 2,
    spatial_balance: null,
    visual_taste: null,
  }
}

export function buildHarnessSummary(opts: {
  runId: string
  artifacts: SummaryArtifacts
  metrics: any
  findings: Array<{ message?: string }>
}): HarnessSummary {
  const status = deriveStatus(opts.metrics, opts.findings)
  const nextAction = deriveNextAction(status, opts.artifacts)

  return {
    run_id: opts.runId,
    case_id: null,
    diagram_type: null,
    status,
    pipeline: [
      ...(opts.artifacts.svg ? ['render-svg'] : []),
      'inspect-svg',
      ...(opts.artifacts.browser_png ? ['capture-browser'] : []),
    ],
    artifacts: opts.artifacts,
    scores: deriveScores(status, opts.findings),
    top_findings: opts.findings.slice(0, 3).map(item => item.message || 'unknown finding'),
    next_action: nextAction,
    judge: {
      required: status === 'suspicious' && Boolean(opts.artifacts.browser_png),
      inputs: {
        artifacts: [
          opts.artifacts.svg,
          opts.artifacts.browser_png,
          opts.artifacts.findings,
          opts.artifacts.dom_html,
        ].filter((item): item is string => Boolean(item)),
      },
    },
  }
}
```

- [ ] **Step 4: Run the summary rules test to verify it passes**

Run: `pnpm --filter @pintora/cli exec jest src/__tests__/harness/summary-rules.spec.ts --runInBand`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add packages/pintora-cli/src/harness/summary-rules.ts packages/pintora-cli/src/__tests__/harness/summary-rules.spec.ts
git commit -m "feat: add harness summary rules"
```

### Task 3: Add `summarize-case` Command and Summary Writer

**Files:**
- Create: `packages/pintora-cli/src/harness/summarize-case.ts`
- Modify: `packages/pintora-cli/src/cli.ts`
- Test: `packages/pintora-cli/src/__tests__/harness/summarize-case.spec.ts`

- [ ] **Step 1: Write the failing summarize command test**

```ts
// packages/pintora-cli/src/__tests__/harness/summarize-case.spec.ts
import * as fs from 'node:fs'
import * as os from 'node:os'
import * as path from 'node:path'
import { runHarnessSummarizeCase } from '../../harness/summarize-case'

describe('runHarnessSummarizeCase', () => {
  it('writes summary.json for an artifacts directory', async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'pintora-summary-case-'))
    fs.writeFileSync(path.join(dir, 'metrics.json'), JSON.stringify({ viewBox: { x: 0, y: 0, width: 100, height: 80 } }))
    fs.writeFileSync(path.join(dir, 'findings.json'), JSON.stringify([]))
    fs.writeFileSync(path.join(dir, 'render.svg'), '<svg></svg>')

    const outFile = path.join(dir, 'summary.json')
    const result = await runHarnessSummarizeCase({
      artifactsDir: dir,
      outFile,
    })

    expect(result.status).toBe('ok')
    expect(result.summary).toBe('summary.json')
    expect(fs.existsSync(outFile)).toBe(true)
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm --filter @pintora/cli exec jest src/__tests__/harness/summarize-case.spec.ts --runInBand`

Expected: FAIL with module-not-found for `../../harness/summarize-case`

- [ ] **Step 3: Implement the summary writer**

```ts
// packages/pintora-cli/src/harness/summarize-case.ts
import * as fs from 'node:fs'
import * as path from 'node:path'
import { statusToExitCode } from './exit-codes'
import { readHarnessArtifacts } from './artifact-reader'
import { buildHarnessSummary } from './summary-rules'

export async function runHarnessSummarizeCase(opts: {
  artifactsDir: string
  outFile: string
}) {
  const read = readHarnessArtifacts({ artifactsDir: opts.artifactsDir })
  const summary = buildHarnessSummary({
    runId: path.basename(opts.artifactsDir),
    artifacts: read.artifacts,
    metrics: read.metrics,
    findings: read.findings,
  })

  fs.writeFileSync(opts.outFile, JSON.stringify(summary, null, 2))

  return {
    status: summary.status,
    nextAction: summary.next_action,
    summary: path.basename(opts.outFile),
    exitCode: statusToExitCode(summary.status),
  }
}
```

- [ ] **Step 4: Wire the CLI command**

```ts
// packages/pintora-cli/src/cli.ts
type HarnessSummarizeCaseArgs = {
  artifacts: string
  out: string
}
```

```ts
// packages/pintora-cli/src/cli.ts
.command<HarnessSummarizeCaseArgs>({
  command: 'summarize-case',
  describe: 'Assemble summary.json from a harness artifacts directory',
  builder: {
    artifacts: { describe: 'Artifacts directory', type: 'string', demandOption: true },
    out: { describe: 'Summary output file', type: 'string', demandOption: true },
  },
  handler: handleHarnessSummarizeCaseCommand,
})
```

```ts
// packages/pintora-cli/src/cli.ts
async function handleHarnessSummarizeCaseCommand(args: HarnessSummarizeCaseArgs) {
  try {
    const result = await runHarnessSummarizeCase({
      artifactsDir: args.artifacts,
      outFile: args.out,
    })
    process.stdout.write(`${JSON.stringify({
      status: result.status,
      nextAction: result.nextAction,
      summary: result.summary,
    })}\n`)
    process.exitCode = result.exitCode
  } catch (error) {
    consola.error(error)
    process.exitCode = 1
  }
}
```

- [ ] **Step 5: Run focused tests**

Run: `pnpm --filter @pintora/cli exec jest src/__tests__/harness/artifact-reader.spec.ts src/__tests__/harness/summary-rules.spec.ts src/__tests__/harness/summarize-case.spec.ts --runInBand`

Expected: PASS

- [ ] **Step 6: Run full CLI tests**

Run: `pnpm --filter @pintora/cli test -- --runInBand`

Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add packages/pintora-cli/src/harness/summarize-case.ts packages/pintora-cli/src/cli.ts packages/pintora-cli/src/__tests__/harness/summarize-case.spec.ts
git commit -m "feat: add harness summarize-case command"
```

### Task 4: Update Docs and Verify Summary Assembly End-to-End

**Files:**
- Modify: `docs/harness/README.md`

- [ ] **Step 1: Update README with summary command docs**

```md
## Summary

- `pintora harness summarize-case --artifacts artifacts/harness/dev --out artifacts/harness/dev/summary.json`

Outputs:

- `summary.json`
```

- [ ] **Step 2: Run a manual summary smoke test**

Prepare a temp artifacts dir containing:

- `metrics.json`
- `findings.json`
- optionally `render.svg`
- optionally `browser.png`
- optionally `dom.html`

Then run:

```bash
node packages/pintora-cli/lib/cli.js harness summarize-case \
  --artifacts artifacts/harness/manual-summary \
  --out artifacts/harness/manual-summary/summary.json
```

Expected:
- stdout JSON includes `status`, `nextAction`, and `summary`
- `summary.json` exists
- exit code is `0`, `10`, or `20` depending on summary status

- [ ] **Step 3: Run full CLI tests one last time**

Run: `pnpm --filter @pintora/cli test -- --runInBand`

Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add docs/harness/README.md
git commit -m "docs: add harness summary usage"
```

### Verification Checklist Before Completion

- [ ] `pnpm --filter @pintora/cli compile`
- [ ] `pnpm --filter @pintora/cli test -- --runInBand`
- [ ] Manual smoke:

```bash
node packages/pintora-cli/lib/cli.js harness summarize-case \
  --artifacts artifacts/harness/manual-summary \
  --out artifacts/harness/manual-summary/summary.json
```

### Self-Review

Spec coverage:
- artifacts-directory-only input is covered in Task 1 and Task 3
- `next_action` field is covered in Task 2
- judge reservation fields are covered in Task 2
- exit code mapping is covered in Task 3
- docs and smoke usage are covered in Task 4

Placeholder scan:
- no `TBD`, `TODO`, or vague placeholders remain

Type consistency:
- `HarnessSummary`
- `SummaryNextAction`
- `readHarnessArtifacts`
- `buildHarnessSummary`
- `runHarnessSummarizeCase`

These names are introduced once and reused consistently across tasks.
