# Pintora Harness Phase 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the first shippable harness slice for Pintora that can resolve a case from a registry, render `svg`, inspect the generated `svg` with high-precision `er` / `sequence` checks, and emit machine-readable artifacts plus status-based exit codes.

**Architecture:** Reuse the existing `@pintora/cli` binary as the phase-1 command surface instead of introducing a second runtime entrypoint. Keep reusable harness logic in `packages/pintora-cli/src/harness/`, keep repository-owned cases in `harness/cases/`, and keep operator-facing docs in `docs/harness/`. Phase 1 intentionally stops before browser capture and rubric-based judging.

**Tech Stack:** TypeScript, yargs CLI, jsdom DOM parsing, Jest, existing Pintora render pipeline

---

### Task 1: Scaffold the Harness Command Surface and Shared Contracts

**Files:**
- Modify: `packages/pintora-cli/src/cli.ts`
- Create: `packages/pintora-cli/src/harness/contracts.ts`
- Create: `packages/pintora-cli/src/harness/exit-codes.ts`
- Create: `packages/pintora-cli/src/harness/case-registry.ts`
- Create: `packages/pintora-cli/src/__tests__/harness/case-registry.spec.ts`
- Create: `packages/pintora-cli/src/__tests__/harness/exit-codes.spec.ts`
- Create: `harness/cases/registry.json`

- [ ] **Step 1: Write the failing registry and exit-code tests**

```ts
// packages/pintora-cli/src/__tests__/harness/case-registry.spec.ts
import path from 'node:path'
import { loadCaseRegistry, resolveCaseInput } from '../../harness/case-registry'

describe('harness case registry', () => {
  it('loads a case by id from harness/cases/registry.json', () => {
    const registry = loadCaseRegistry(process.cwd())
    const item = registry.get('er.relationship-spacing-01')

    expect(item?.diagram_type).toBe('er')
    expect(item?.checks).toContain('svg-structure')
  })

  it('resolves the input file to an absolute .pintora path', () => {
    const absPath = resolveCaseInput(process.cwd(), 'er.relationship-spacing-01')
    expect(absPath).toBe(path.join(process.cwd(), 'harness/cases/er/relationship-spacing-01.pintora'))
  })
})
```

```ts
// packages/pintora-cli/src/__tests__/harness/exit-codes.spec.ts
import { statusToExitCode } from '../../harness/exit-codes'

describe('statusToExitCode', () => {
  it.each([
    ['ok', 0],
    ['suspicious', 10],
    ['fail', 20],
  ])('maps %s to %i', (status, expected) => {
    expect(statusToExitCode(status as 'ok' | 'suspicious' | 'fail')).toBe(expected)
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm exec jest packages/pintora-cli/src/__tests__/harness/case-registry.spec.ts packages/pintora-cli/src/__tests__/harness/exit-codes.spec.ts --runInBand`

Expected: FAIL with module-not-found errors for `../../harness/case-registry` and `../../harness/exit-codes`

- [ ] **Step 3: Add the minimal shared contracts and registry seed**

```ts
// packages/pintora-cli/src/harness/contracts.ts
export type HarnessStatus = 'ok' | 'suspicious' | 'fail'

export type HarnessCase = {
  id: string
  diagram_type: 'er' | 'sequence'
  title: string
  input_file: string
  tags: string[]
  checks: string[]
  escalation_policy: {
    capture_browser_on: HarnessStatus[]
  }
  golden: {
    require_svg: boolean
    require_browser_png: boolean
  }
}
```

```ts
// packages/pintora-cli/src/harness/exit-codes.ts
import { HarnessStatus } from './contracts'

export function statusToExitCode(status: HarnessStatus) {
  if (status === 'suspicious') return 10
  if (status === 'fail') return 20
  return 0
}
```

```ts
// packages/pintora-cli/src/harness/case-registry.ts
import * as fs from 'node:fs'
import * as path from 'node:path'
import { HarnessCase } from './contracts'

type RegistryFile = {
  cases: HarnessCase[]
}

export function getRegistryPath(cwd: string) {
  return path.join(cwd, 'harness/cases/registry.json')
}

export function loadCaseRegistry(cwd: string) {
  const raw = fs.readFileSync(getRegistryPath(cwd), 'utf8')
  const parsed = JSON.parse(raw) as RegistryFile
  return new Map(parsed.cases.map(item => [item.id, item]))
}

export function resolveCaseInput(cwd: string, caseId: string) {
  const item = loadCaseRegistry(cwd).get(caseId)
  if (!item) throw new Error(`Unknown harness case: ${caseId}`)
  return path.join(cwd, 'harness/cases', item.input_file)
}
```

```json
// harness/cases/registry.json
{
  "cases": [
    {
      "id": "er.relationship-spacing-01",
      "diagram_type": "er",
      "title": "ER horizontal marker should stay outside entity border",
      "input_file": "er/relationship-spacing-01.pintora",
      "tags": ["spacing", "cardinality", "layout"],
      "checks": ["svg-structure", "entity-border-clearance", "relationship-label-lane-stability"],
      "escalation_policy": {
        "capture_browser_on": ["suspicious", "fail"]
      },
      "golden": {
        "require_svg": true,
        "require_browser_png": false
      }
    }
  ]
}
```

- [ ] **Step 4: Add a harness command namespace to the CLI**

```ts
// packages/pintora-cli/src/cli.ts
yargs.command({
  command: 'harness <command>',
  describe: 'Harness utilities for layout validation',
  builder: y =>
    y.command({
      command: 'render-svg',
      builder: {
        case: { type: 'string' },
        input: { type: 'string' },
        out: { type: 'string', demandOption: true },
      },
      handler: handleHarnessRenderSvgCommand,
    }),
})
```

The first commit only needs the namespace and argument plumbing. The handler can temporarily throw `new Error('Not implemented')` so that command wiring is testable before full implementation.

- [ ] **Step 5: Run tests to verify the new shared contracts pass**

Run: `pnpm exec jest packages/pintora-cli/src/__tests__/harness/case-registry.spec.ts packages/pintora-cli/src/__tests__/harness/exit-codes.spec.ts --runInBand`

Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add packages/pintora-cli/src/cli.ts packages/pintora-cli/src/harness/contracts.ts packages/pintora-cli/src/harness/exit-codes.ts packages/pintora-cli/src/harness/case-registry.ts packages/pintora-cli/src/__tests__/harness/case-registry.spec.ts packages/pintora-cli/src/__tests__/harness/exit-codes.spec.ts harness/cases/registry.json
git commit -m "feat: scaffold harness contracts and registry"
```

### Task 2: Implement `render-svg` With Case/Input Resolution and Structured JSON Output

**Files:**
- Modify: `packages/pintora-cli/src/cli.ts`
- Create: `packages/pintora-cli/src/harness/read-input.ts`
- Create: `packages/pintora-cli/src/harness/render-svg.ts`
- Create: `packages/pintora-cli/src/__tests__/harness/render-svg.spec.ts`
- Create: `harness/cases/er/relationship-spacing-01.pintora`
- Create: `harness/cases/sequence/lifeline-label-separation-01.pintora`

- [ ] **Step 1: Write the failing `render-svg` tests**

```ts
// packages/pintora-cli/src/__tests__/harness/render-svg.spec.ts
import * as fs from 'node:fs'
import * as os from 'node:os'
import * as path from 'node:path'
import { runHarnessRenderSvg } from '../../harness/render-svg'

describe('runHarnessRenderSvg', () => {
  it('renders svg from a registry case into the target file', async () => {
    const outDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pintora-harness-'))
    const outFile = path.join(outDir, 'render.svg')

    const result = await runHarnessRenderSvg({
      cwd: process.cwd(),
      caseId: 'er.relationship-spacing-01',
      outFile,
    })

    expect(result.status).toBe('ok')
    expect(result.diagramType).toBe('er')
    expect(fs.readFileSync(outFile, 'utf8')).toContain('<svg')
  })

  it('accepts --input when no case id is provided', async () => {
    const outDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pintora-harness-'))
    const outFile = path.join(outDir, 'render.svg')
    const inputFile = path.join(process.cwd(), 'harness/cases/sequence/lifeline-label-separation-01.pintora')

    const result = await runHarnessRenderSvg({
      cwd: process.cwd(),
      inputFile,
      outFile,
    })

    expect(result.status).toBe('ok')
    expect(result.diagramType).toBe('sequence')
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm exec jest packages/pintora-cli/src/__tests__/harness/render-svg.spec.ts --runInBand`

Expected: FAIL with module-not-found for `../../harness/render-svg`

- [ ] **Step 3: Implement input resolution and svg rendering**

```ts
// packages/pintora-cli/src/harness/read-input.ts
import * as fs from 'node:fs'
import { loadCaseRegistry, resolveCaseInput } from './case-registry'

export function resolveHarnessInput(opts: { cwd: string; caseId?: string; inputFile?: string }) {
  if (opts.caseId) {
    const registry = loadCaseRegistry(opts.cwd)
    const item = registry.get(opts.caseId)
    if (!item) throw new Error(`Unknown harness case: ${opts.caseId}`)
    return {
      caseMeta: item,
      inputFile: resolveCaseInput(opts.cwd, opts.caseId),
    }
  }

  if (!opts.inputFile) throw new Error('Either --case or --input is required')
  return {
    caseMeta: null,
    inputFile: opts.inputFile,
  }
}

export function readHarnessSource(inputFile: string) {
  return fs.readFileSync(inputFile, 'utf8')
}
```

```ts
// packages/pintora-cli/src/harness/render-svg.ts
import * as fs from 'node:fs'
import * as path from 'node:path'
import { SVG_MIME_TYPE } from '../const'
import { render } from '../render'
import { readHarnessSource, resolveHarnessInput } from './read-input'

export async function runHarnessRenderSvg(opts: {
  cwd: string
  caseId?: string
  inputFile?: string
  outFile: string
}) {
  const resolved = resolveHarnessInput(opts)
  const code = readHarnessSource(resolved.inputFile)
  const svg = (await render({ code, mimeType: SVG_MIME_TYPE, renderInSubprocess: false })) as string

  fs.mkdirSync(path.dirname(opts.outFile), { recursive: true })
  fs.writeFileSync(opts.outFile, svg)

  return {
    status: 'ok' as const,
    diagramType: resolved.caseMeta?.diagram_type ?? inferDiagramType(code),
    artifact: path.basename(opts.outFile),
  }
}

function inferDiagramType(code: string) {
  if (/^\s*erDiagram/m.test(code)) return 'er'
  if (/^\s*sequenceDiagram/m.test(code)) return 'sequence'
  return 'unknown'
}
```

- [ ] **Step 4: Wire the handler to JSON stdout and stable process exit**

```ts
// packages/pintora-cli/src/cli.ts
async function handleHarnessRenderSvgCommand(args: { case?: string; input?: string; out: string }) {
  const result = await runHarnessRenderSvg({
    cwd: CWD,
    caseId: args.case,
    inputFile: args.input,
    outFile: args.out,
  })

  process.stdout.write(`${JSON.stringify(result)}\n`)
  process.exitCode = 0
}
```

- [ ] **Step 5: Add two seed cases with stable fixture names**

```text
// harness/cases/er/relationship-spacing-01.pintora
erDiagram
  PERSON ||--o{ ORDER : places
  PERSON {
    string name
  }
  ORDER {
    string id
  }
```

```text
// harness/cases/sequence/lifeline-label-separation-01.pintora
sequenceDiagram
  participant Customer Support
  participant Billing Service
  Customer Support->>Billing Service: reconcile invoice
```

- [ ] **Step 6: Run tests to verify `render-svg` passes**

Run: `pnpm exec jest packages/pintora-cli/src/__tests__/harness/render-svg.spec.ts --runInBand`

Expected: PASS

- [ ] **Step 7: Smoke-test the CLI command**

Run: `pnpm exec jest packages/pintora-cli/src/__tests__/harness/render-svg.spec.ts --runInBand && pnpm --filter @pintora/cli test -- --runInBand render.spec.ts`

Expected: PASS and no regression in existing CLI render tests

- [ ] **Step 8: Commit**

```bash
git add packages/pintora-cli/src/cli.ts packages/pintora-cli/src/harness/read-input.ts packages/pintora-cli/src/harness/render-svg.ts packages/pintora-cli/src/__tests__/harness/render-svg.spec.ts harness/cases/er/relationship-spacing-01.pintora harness/cases/sequence/lifeline-label-separation-01.pintora
git commit -m "feat: add harness render-svg command"
```

### Task 3: Implement `inspect-svg` Metrics, Rule Engine, and Exit-Code Semantics

**Files:**
- Modify: `packages/pintora-cli/src/cli.ts`
- Create: `packages/pintora-cli/src/harness/svg-parse.ts`
- Create: `packages/pintora-cli/src/harness/svg-metrics.ts`
- Create: `packages/pintora-cli/src/harness/findings.ts`
- Create: `packages/pintora-cli/src/harness/rules/er-rules.ts`
- Create: `packages/pintora-cli/src/harness/rules/sequence-rules.ts`
- Create: `packages/pintora-cli/src/harness/inspect-svg.ts`
- Create: `packages/pintora-cli/src/__tests__/harness/inspect-svg.spec.ts`

- [ ] **Step 1: Write the failing `inspect-svg` tests**

```ts
// packages/pintora-cli/src/__tests__/harness/inspect-svg.spec.ts
import * as fs from 'node:fs'
import * as os from 'node:os'
import * as path from 'node:path'
import { runHarnessInspectSvg } from '../../harness/inspect-svg'

describe('runHarnessInspectSvg', () => {
  it('writes metrics.json and findings.json for a healthy ER case', async () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pintora-harness-inspect-'))
    const svg = path.join(tmpDir, 'render.svg')
    fs.writeFileSync(svg, '<svg viewBox="0 0 200 100"><rect x="10" y="10" width="180" height="80" /><text x="30" y="40">PERSON</text></svg>')

    const result = await runHarnessInspectSvg({
      cwd: process.cwd(),
      svgFile: svg,
      caseId: 'er.relationship-spacing-01',
      outDir: tmpDir,
    })

    expect(result.status).toBe('ok')
    expect(fs.existsSync(path.join(tmpDir, 'metrics.json'))).toBe(true)
    expect(fs.existsSync(path.join(tmpDir, 'findings.json'))).toBe(true)
  })

  it('returns suspicious when text is too close to the viewBox edge', async () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pintora-harness-inspect-'))
    const svg = path.join(tmpDir, 'render.svg')
    fs.writeFileSync(svg, '<svg viewBox="0 0 120 40"><text x="1" y="10">edge</text></svg>')

    const result = await runHarnessInspectSvg({
      cwd: process.cwd(),
      svgFile: svg,
      caseId: 'sequence.lifeline-label-separation-01',
      outDir: tmpDir,
    })

    expect(result.status).toBe('suspicious')
    expect(result.findingCount).toBeGreaterThan(0)
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm exec jest packages/pintora-cli/src/__tests__/harness/inspect-svg.spec.ts --runInBand`

Expected: FAIL with module-not-found for `../../harness/inspect-svg`

- [ ] **Step 3: Parse SVG and calculate objective metrics**

```ts
// packages/pintora-cli/src/harness/svg-parse.ts
import { JSDOM } from 'jsdom'

export function parseSvg(svgText: string) {
  const dom = new JSDOM(svgText, { contentType: 'image/svg+xml' })
  const root = dom.window.document.querySelector('svg')
  if (!root) throw new Error('Invalid svg: missing <svg> root')
  return { dom, root }
}
```

```ts
// packages/pintora-cli/src/harness/svg-metrics.ts
export type SvgMetricSnapshot = {
  viewBox: { x: number; y: number; width: number; height: number }
  textNodes: Array<{ text: string; x: number; y: number }>
  elementCounts: Record<string, number>
  minTextToEdge: number | null
}
```

At minimum, the implementation should:
- parse `viewBox`
- collect `text`, `rect`, `line`, `path`, `polygon` counts
- collect text anchor coordinates from `x` / `y`
- compute `minTextToEdge`

- [ ] **Step 4: Implement high-precision phase-1 rules**

```ts
// packages/pintora-cli/src/harness/rules/er-rules.ts
export function runErRules(metrics: SvgMetricSnapshot) {
  const findings = []
  if (metrics.minTextToEdge !== null && metrics.minTextToEdge < 4) {
    findings.push({
      id: 'entity-border-clearance',
      severity: 'warning',
      message: 'text is too close to the diagram edge for an ER case',
    })
  }
  return findings
}
```

```ts
// packages/pintora-cli/src/harness/rules/sequence-rules.ts
export function runSequenceRules(metrics: SvgMetricSnapshot) {
  const findings = []
  if (metrics.minTextToEdge !== null && metrics.minTextToEdge < 4) {
    findings.push({
      id: 'edge-overflow',
      severity: 'warning',
      message: 'label is pushed too close to the viewBox edge',
    })
  }
  return findings
}
```

Phase-1 rule policy:
- `ok`: no findings
- `suspicious`: one or more warning findings
- `fail`: reserved for clearly broken SVG structure such as missing viewBox or empty root content

- [ ] **Step 5: Assemble `inspect-svg` outputs**

```ts
// packages/pintora-cli/src/harness/inspect-svg.ts
import * as fs from 'node:fs'
import * as path from 'node:path'
import { loadCaseRegistry } from './case-registry'
import { buildSvgMetrics } from './svg-metrics'
import { parseSvg } from './svg-parse'
import { runErRules } from './rules/er-rules'
import { runSequenceRules } from './rules/sequence-rules'

export async function runHarnessInspectSvg(opts: {
  cwd: string
  svgFile: string
  caseId?: string
  outDir: string
}) {
  const svgText = fs.readFileSync(opts.svgFile, 'utf8')
  const { root } = parseSvg(svgText)
  const registryItem = opts.caseId ? loadCaseRegistry(opts.cwd).get(opts.caseId) : null
  const metrics = buildSvgMetrics(root)

  const findings =
    registryItem?.diagram_type === 'er'
      ? runErRules(metrics)
      : registryItem?.diagram_type === 'sequence'
        ? runSequenceRules(metrics)
        : []

  const status =
    !root.getAttribute('viewBox') || root.childElementCount === 0
      ? 'fail'
      : findings.length > 0
        ? 'suspicious'
        : 'ok'

  fs.mkdirSync(opts.outDir, { recursive: true })
  fs.writeFileSync(path.join(opts.outDir, 'metrics.json'), JSON.stringify(metrics, null, 2))
  fs.writeFileSync(path.join(opts.outDir, 'findings.json'), JSON.stringify(findings, null, 2))

  return {
    status,
    findingCount: findings.length,
    artifacts: ['metrics.json', 'findings.json'],
  }
}
```

The function must:
- create `outDir`
- write `metrics.json` and `findings.json`
- return `status` and `findingCount`
- map `status` to process exit code with `statusToExitCode`

- [ ] **Step 6: Wire the CLI subcommand**

```ts
// packages/pintora-cli/src/cli.ts
yargs.command({
  command: 'harness inspect-svg',
  builder: {
    in: { type: 'string', demandOption: true },
    case: { type: 'string' },
    'out-dir': { type: 'string', demandOption: true },
  },
  handler: handleHarnessInspectSvgCommand,
})
```

The handler should print:

```json
{"status":"suspicious","findingCount":1,"artifacts":["metrics.json","findings.json"]}
```

- [ ] **Step 7: Run tests to verify `inspect-svg` passes**

Run: `pnpm exec jest packages/pintora-cli/src/__tests__/harness/inspect-svg.spec.ts --runInBand`

Expected: PASS

- [ ] **Step 8: Run focused regression tests**

Run: `pnpm --filter @pintora/cli test -- --runInBand render.spec.ts render-cases.spec.ts`

Expected: PASS

- [ ] **Step 9: Commit**

```bash
git add packages/pintora-cli/src/cli.ts packages/pintora-cli/src/harness/svg-parse.ts packages/pintora-cli/src/harness/svg-metrics.ts packages/pintora-cli/src/harness/findings.ts packages/pintora-cli/src/harness/rules/er-rules.ts packages/pintora-cli/src/harness/rules/sequence-rules.ts packages/pintora-cli/src/harness/inspect-svg.ts packages/pintora-cli/src/__tests__/harness/inspect-svg.spec.ts
git commit -m "feat: add harness inspect-svg pipeline"
```

### Task 4: Expand the Case Registry, Add Operator Docs, and Verify the End-to-End Phase 1 Loop

**Files:**
- Modify: `harness/cases/registry.json`
- Create: `harness/cases/er/relationship-label-lane-01.pintora`
- Create: `harness/cases/er/crowding-hotspot-01.pintora`
- Create: `harness/cases/sequence/message-label-collision-01.pintora`
- Create: `harness/cases/sequence/activation-stack-clarity-01.pintora`
- Create: `docs/harness/README.md`
- Create: `packages/pintora-cli/src/__tests__/harness/harness-e2e.spec.ts`

- [ ] **Step 1: Write the failing end-to-end test**

```ts
// packages/pintora-cli/src/__tests__/harness/harness-e2e.spec.ts
import * as fs from 'node:fs'
import * as os from 'node:os'
import * as path from 'node:path'
import { runHarnessRenderSvg } from '../../harness/render-svg'
import { runHarnessInspectSvg } from '../../harness/inspect-svg'

describe('phase-1 harness e2e', () => {
  it('renders and inspects a registry case with machine-readable artifacts', async () => {
    const outDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pintora-harness-e2e-'))
    const svgFile = path.join(outDir, 'render.svg')

    await runHarnessRenderSvg({
      cwd: process.cwd(),
      caseId: 'er.relationship-spacing-01',
      outFile: svgFile,
    })

    const summary = await runHarnessInspectSvg({
      cwd: process.cwd(),
      svgFile,
      caseId: 'er.relationship-spacing-01',
      outDir,
    })

    expect(summary.artifacts).toEqual(['metrics.json', 'findings.json'])
    expect(fs.existsSync(path.join(outDir, 'metrics.json'))).toBe(true)
    expect(fs.existsSync(path.join(outDir, 'findings.json'))).toBe(true)
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm exec jest packages/pintora-cli/src/__tests__/harness/harness-e2e.spec.ts --runInBand`

Expected: FAIL until the registry is expanded and the inspect pipeline is complete

- [ ] **Step 3: Add 5 total high-value seed cases across ER and sequence**

Registry target:
- `er.relationship-spacing-01`
- `er.relationship-label-lane-01`
- `er.crowding-hotspot-01`
- `sequence.lifeline-label-separation-01`
- `sequence.message-label-collision-01`
- `sequence.activation-stack-clarity-01`

Each case file should be:
- small
- single-purpose
- named after the rule being exercised
- referenced explicitly in `registry.json`

- [ ] **Step 4: Add operator-facing docs**

```md
<!-- docs/harness/README.md -->
# Harness Phase 1

## Commands

- `pintora harness render-svg --case er.relationship-spacing-01 --out artifacts/harness/dev/render.svg`
- `pintora harness inspect-svg --in artifacts/harness/dev/render.svg --case er.relationship-spacing-01 --out-dir artifacts/harness/dev`

## Artifacts

- `render.svg`
- `metrics.json`
- `findings.json`

## Exit codes

- `0`: ok
- `10`: suspicious
- `20`: fail
```

- [ ] **Step 5: Run focused harness tests**

Run: `pnpm exec jest packages/pintora-cli/src/__tests__/harness/case-registry.spec.ts packages/pintora-cli/src/__tests__/harness/render-svg.spec.ts packages/pintora-cli/src/__tests__/harness/inspect-svg.spec.ts packages/pintora-cli/src/__tests__/harness/harness-e2e.spec.ts --runInBand`

Expected: PASS

- [ ] **Step 6: Run package-level regression tests**

Run: `pnpm --filter @pintora/cli test -- --runInBand`

Expected: PASS for the full `@pintora/cli` test suite

- [ ] **Step 7: Commit**

```bash
git add harness/cases/registry.json harness/cases/er/relationship-label-lane-01.pintora harness/cases/er/crowding-hotspot-01.pintora harness/cases/sequence/message-label-collision-01.pintora harness/cases/sequence/activation-stack-clarity-01.pintora docs/harness/README.md packages/pintora-cli/src/__tests__/harness/harness-e2e.spec.ts
git commit -m "feat: seed harness phase-1 cases and docs"
```

### Out of Scope for This Plan

- `capture-browser`
- `render-png`
- `summary.json`
- `docs/harness/rubric.md`
- any model-based or human-in-the-loop judging adapter

These remain Phase 2 / Phase 3 work and should be planned separately after Phase 1 is stable.

### Verification Checklist Before Completion

- [ ] `pnpm exec jest packages/pintora-cli/src/__tests__/harness/case-registry.spec.ts packages/pintora-cli/src/__tests__/harness/render-svg.spec.ts packages/pintora-cli/src/__tests__/harness/inspect-svg.spec.ts packages/pintora-cli/src/__tests__/harness/harness-e2e.spec.ts --runInBand`
- [ ] `pnpm --filter @pintora/cli test -- --runInBand`
- [ ] Manual smoke test:

```bash
pnpm --filter @pintora/cli exec pintora harness render-svg --case er.relationship-spacing-01 --out artifacts/harness/manual/render.svg
pnpm --filter @pintora/cli exec pintora harness inspect-svg --in artifacts/harness/manual/render.svg --case er.relationship-spacing-01 --out-dir artifacts/harness/manual
```

Expected manual result:
- first command writes `render.svg` and prints `{"status":"ok","diagramType":"er","artifact":"render.svg"}`
- second command writes `metrics.json` and `findings.json`
- second command exits with `0`, `10`, or `20` based on findings, without throwing
