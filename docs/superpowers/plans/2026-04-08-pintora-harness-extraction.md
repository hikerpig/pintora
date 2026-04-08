# Pintora Harness Extraction Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extract the existing harness runtime and commands out of `@pintora/cli` into a new internal package `@pintora/harness` with its own `pintora-harness` CLI, while removing all harness awareness from `@pintora/cli`.

**Architecture:** Build a new workspace package `packages/pintora-harness` that owns harness contracts, runtime modules, tests, and CLI entrypoints. Migrate the existing harness implementation into that package in focused slices, verify the new CLI matches current behavior, then delete the old harness command group and harness-only source from `@pintora/cli`.

**Tech Stack:** TypeScript, pnpm workspaces, yargs, Jest, Playwright, existing Pintora runtime packages

---

### File Structure

**Create:**
- `packages/pintora-harness/package.json`
- `packages/pintora-harness/tsconfig.json`
- `packages/pintora-harness/src/cli.ts`
- `packages/pintora-harness/src/index.ts`
- `packages/pintora-harness/src/contracts/harness.ts`
- `packages/pintora-harness/src/contracts/browser.ts`
- `packages/pintora-harness/src/contracts/summary.ts`
- `packages/pintora-harness/src/cases/case-registry.ts`
- `packages/pintora-harness/src/cases/read-input.ts`
- `packages/pintora-harness/src/rendering/render-adapter.ts`
- `packages/pintora-harness/src/rendering/render-svg.ts`
- `packages/pintora-harness/src/inspection/findings.ts`
- `packages/pintora-harness/src/inspection/svg-parse.ts`
- `packages/pintora-harness/src/inspection/svg-metrics.ts`
- `packages/pintora-harness/src/inspection/inspect-svg.ts`
- `packages/pintora-harness/src/inspection/rules/er-rules.ts`
- `packages/pintora-harness/src/inspection/rules/sequence-rules.ts`
- `packages/pintora-harness/src/browser/browser-contracts.ts`
- `packages/pintora-harness/src/browser/browser-preview-url.ts`
- `packages/pintora-harness/src/browser/browser-capture.ts`
- `packages/pintora-harness/src/browser/capture-browser.ts`
- `packages/pintora-harness/src/summary/artifact-reader.ts`
- `packages/pintora-harness/src/summary/summary-rules.ts`
- `packages/pintora-harness/src/summary/summarize-case.ts`
- `packages/pintora-harness/src/exit-codes.ts`
- `packages/pintora-harness/src/__tests__/case-registry.spec.ts`
- `packages/pintora-harness/src/__tests__/render-svg.spec.ts`
- `packages/pintora-harness/src/__tests__/inspect-svg.spec.ts`
- `packages/pintora-harness/src/__tests__/browser-preview-url.spec.ts`
- `packages/pintora-harness/src/__tests__/capture-browser.spec.ts`
- `packages/pintora-harness/src/__tests__/artifact-reader.spec.ts`
- `packages/pintora-harness/src/__tests__/summary-rules.spec.ts`
- `packages/pintora-harness/src/__tests__/summarize-case.spec.ts`
- `packages/pintora-harness/src/__tests__/harness-e2e.spec.ts`
- `packages/pintora-harness/src/__tests__/cli.spec.ts`

**Modify:**
- `package.json`
- `pnpm-lock.yaml`
- `docs/harness/README.md`
- `packages/pintora-cli/package.json`
- `packages/pintora-cli/src/cli.ts`
- `packages/pintora-cli/src/render.ts` only if extraction reveals a truly shared non-harness helper worth keeping

**Delete:**
- `packages/pintora-cli/src/harness/`
- `packages/pintora-cli/src/__tests__/harness/`

### Design Notes Locked In

- `@pintora/cli` must not expose or import harness commands
- the new CLI name is `pintora-harness`
- old `pintora harness ...` commands are removed, not shimmed
- `@pintora/harness` must not depend on `@pintora/cli`
- `harness/cases/` remains repo-level asset storage in this phase
- harness exit code semantics remain `0/10/20/1`
- the extraction preserves current stdout JSON shapes as closely as possible

### Task 1: Scaffold `@pintora/harness` Package and Minimal CLI Shell

**Files:**
- Create: `packages/pintora-harness/package.json`
- Create: `packages/pintora-harness/tsconfig.json`
- Create: `packages/pintora-harness/src/index.ts`
- Create: `packages/pintora-harness/src/cli.ts`
- Modify: `package.json`
- Test: `packages/pintora-harness/src/__tests__/cli.spec.ts`

- [ ] **Step 1: Write the failing CLI shell test**

```ts
// packages/pintora-harness/src/__tests__/cli.spec.ts
+describe('pintora-harness cli shell', () => {
+  const originalArgv = process.argv.slice()
+
+  beforeEach(() => {
+    jest.resetModules()
+    process.argv = ['node', 'pintora-harness', '--help']
+  })
+
+  afterEach(() => {
+    process.argv = originalArgv.slice()
+    jest.restoreAllMocks()
+  })
+
+  it('boots the harness cli without importing @pintora/cli', () => {
+    const stdoutSpy = jest.spyOn(process.stdout, 'write').mockImplementation(() => true)
+
+    jest.mock('@pintora/cli', () => {
+      throw new Error('@pintora/cli must not be imported')
+    })
+
+    expect(() => {
+      jest.isolateModules(() => {
+        require('../cli')
+      })
+    }).not.toThrow()
+
+    expect(stdoutSpy).toHaveBeenCalled()
+  })
+})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm exec jest packages/pintora-harness/src/__tests__/cli.spec.ts --runInBand`
Expected: FAIL with module-not-found for `packages/pintora-harness/src/cli.ts`

- [ ] **Step 3: Create package metadata and tsconfig**

```json
// packages/pintora-harness/package.json
{
  "name": "@pintora/harness",
  "version": "0.8.1",
  "private": true,
  "description": "Internal harness tooling for Pintora",
  "main": "lib/index.js",
  "types": "lib/index.d.ts",
  "bin": {
    "pintora-harness": "./bin/pintora-harness"
  },
  "files": ["lib", "CHANGELOG.md"],
  "scripts": {
    "compile": "rimraf lib tsconfig.tsbuildinfo && tsc",
    "watch": "tsc -w",
    "test": "jest --forceExit"
  },
  "dependencies": {
    "@pintora/core": "workspace:^0.8.1",
    "@pintora/renderer": "workspace:^0.8.1",
    "@pintora/standalone": "workspace:^0.8.1",
    "consola": "^3.0.0",
    "jsdom": "^26.0.0",
    "playwright": "^1.55.0",
    "yargs": "^17.7.2"
  },
  "devDependencies": {
    "@types/jsdom": "^21.0.0",
    "@types/node": "^18.12.0",
    "@types/yargs": "^17.0.33",
    "typescript": "^5.9.0"
  }
}
```

```json
// packages/pintora-harness/tsconfig.json
{
  "extends": "../../tsconfig.json",
  "compilerOptions": {
    "outDir": "lib",
    "rootDir": "src",
    "declaration": true,
    "declarationDir": "lib",
    "types": ["node", "jest"]
  },
  "include": ["src/**/*"]
}
```

```ts
// packages/pintora-harness/src/index.ts
export {}
```

```ts
// packages/pintora-harness/src/cli.ts
import yargs from 'yargs'

yargs.scriptName('pintora-harness').help().showHelpOnFail(true).demandCommand(1).parse()
```

- [ ] **Step 4: Add the package to workspace metadata if needed**

```json
// package.json
{
  "workspaces": [
    "./packages/*",
    "./website",
    "./demo"
  ]
}
```

No new workspace path is needed because `./packages/*` already matches `packages/pintora-harness`, but update `pnpm-lock.yaml` via install if dependencies change.

- [ ] **Step 5: Run install or compile metadata refresh if required**

Run: `pnpm install`
Expected: workspace recognizes `@pintora/harness` and lockfile updates only for the new package

- [ ] **Step 6: Run the CLI shell test to verify it passes**

Run: `pnpm exec jest packages/pintora-harness/src/__tests__/cli.spec.ts --runInBand`
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add package.json pnpm-lock.yaml packages/pintora-harness/package.json packages/pintora-harness/tsconfig.json packages/pintora-harness/src/index.ts packages/pintora-harness/src/cli.ts packages/pintora-harness/src/__tests__/cli.spec.ts
git commit -m "feat: scaffold pintora harness package"
```

### Task 2: Migrate Contracts, Case Resolution, and Inspection Core

**Files:**
- Create: `packages/pintora-harness/src/contracts/harness.ts`
- Create: `packages/pintora-harness/src/contracts/summary.ts`
- Create: `packages/pintora-harness/src/contracts/browser.ts`
- Create: `packages/pintora-harness/src/cases/case-registry.ts`
- Create: `packages/pintora-harness/src/cases/read-input.ts`
- Create: `packages/pintora-harness/src/inspection/findings.ts`
- Create: `packages/pintora-harness/src/inspection/svg-parse.ts`
- Create: `packages/pintora-harness/src/inspection/svg-metrics.ts`
- Create: `packages/pintora-harness/src/inspection/inspect-svg.ts`
- Create: `packages/pintora-harness/src/inspection/rules/er-rules.ts`
- Create: `packages/pintora-harness/src/inspection/rules/sequence-rules.ts`
- Create: `packages/pintora-harness/src/exit-codes.ts`
- Test: `packages/pintora-harness/src/__tests__/case-registry.spec.ts`
- Test: `packages/pintora-harness/src/__tests__/inspect-svg.spec.ts`

- [ ] **Step 1: Write the failing migrated case-registry and inspect tests**

```ts
// packages/pintora-harness/src/__tests__/case-registry.spec.ts
+import { loadCaseRegistry } from '../cases/case-registry'
+
+describe('loadCaseRegistry', () => {
+  it('reads the repo-level harness registry', () => {
+    const registry = loadCaseRegistry(process.cwd())
+    expect(registry.get('er.relationship-spacing-01')?.diagram_type).toBe('er')
+  })
+})
```

```ts
// packages/pintora-harness/src/__tests__/inspect-svg.spec.ts
+import * as fs from 'node:fs'
+import * as os from 'node:os'
+import * as path from 'node:path'
+import { runHarnessInspectSvg } from '../inspection/inspect-svg'
+
+describe('runHarnessInspectSvg', () => {
+  it('returns fail for an empty svg with viewBox and persists rootChildCount', async () => {
+    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pintora-harness-inspect-'))
+    const svg = path.join(tmpDir, 'render.svg')
+    fs.writeFileSync(svg, '<svg viewBox="0 0 120 40"></svg>')
+
+    const result = await runHarnessInspectSvg({
+      cwd: process.cwd(),
+      svgFile: svg,
+      caseId: 'sequence.lifeline-label-separation-01',
+      outDir: tmpDir,
+    })
+
+    const metrics = JSON.parse(fs.readFileSync(path.join(tmpDir, 'metrics.json'), 'utf8'))
+    expect(result.status).toBe('fail')
+    expect(metrics.rootChildCount).toBe(0)
+  })
+})
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `pnpm exec jest packages/pintora-harness/src/__tests__/case-registry.spec.ts packages/pintora-harness/src/__tests__/inspect-svg.spec.ts --runInBand`
Expected: FAIL with module-not-found errors for the new harness package paths

- [ ] **Step 3: Migrate contracts and core inspection files with package-local imports**

```ts
// packages/pintora-harness/src/contracts/harness.ts
export type HarnessStatus = 'ok' | 'suspicious' | 'fail'

export type HarnessDiagramType = 'er' | 'sequence'

export type HarnessCase = {
  id: string
  diagram_type: HarnessDiagramType
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
// packages/pintora-harness/src/exit-codes.ts
import { HarnessStatus } from './contracts/harness'

export function statusToExitCode(status: HarnessStatus) {
  if (status === 'suspicious') return 10
  if (status === 'fail') return 20
  return 0
}
```

```ts
// packages/pintora-harness/src/cases/case-registry.ts
import * as fs from 'node:fs'
import * as path from 'node:path'
import { HarnessCase } from '../contracts/harness'

export function resolveHarnessWorkspaceRoot(cwd: string) {
  return cwd
}

export function loadCaseRegistry(cwd: string) {
  const root = resolveHarnessWorkspaceRoot(cwd)
  const registryFile = path.join(root, 'harness/cases/registry.json')
  const entries = JSON.parse(fs.readFileSync(registryFile, 'utf8')) as HarnessCase[]
  return new Map(entries.map(entry => [entry.id, entry]))
}
```

```ts
// packages/pintora-harness/src/inspection/inspect-svg.ts
import * as fs from 'node:fs'
import * as path from 'node:path'
import { loadCaseRegistry } from '../cases/case-registry'
import { HarnessStatus } from '../contracts/harness'
import { runErRules } from './rules/er-rules'
import { runSequenceRules } from './rules/sequence-rules'
import { parseSvg } from './svg-parse'
import { buildSvgMetrics } from './svg-metrics'

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

  const status: HarnessStatus =
    !metrics.viewBox || metrics.rootChildCount === 0 ? 'fail' : findings.length > 0 ? 'suspicious' : 'ok'

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

For the remaining files in this task, migrate the current `packages/pintora-cli/src/harness/*` implementation with import path updates only. Do not redesign behavior in this migration step.

- [ ] **Step 4: Export the migrated runtime from the new package**

```ts
// packages/pintora-harness/src/index.ts
export { statusToExitCode } from './exit-codes'
export { runHarnessInspectSvg } from './inspection/inspect-svg'
export { loadCaseRegistry } from './cases/case-registry'
export { readHarnessSource, resolveHarnessInput } from './cases/read-input'
export type { HarnessCase, HarnessDiagramType, HarnessStatus } from './contracts/harness'
```

- [ ] **Step 5: Run the focused tests to verify they pass**

Run: `pnpm exec jest packages/pintora-harness/src/__tests__/case-registry.spec.ts packages/pintora-harness/src/__tests__/inspect-svg.spec.ts --runInBand`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add packages/pintora-harness/src/contracts/harness.ts packages/pintora-harness/src/contracts/summary.ts packages/pintora-harness/src/contracts/browser.ts packages/pintora-harness/src/cases/case-registry.ts packages/pintora-harness/src/cases/read-input.ts packages/pintora-harness/src/inspection/findings.ts packages/pintora-harness/src/inspection/svg-parse.ts packages/pintora-harness/src/inspection/svg-metrics.ts packages/pintora-harness/src/inspection/inspect-svg.ts packages/pintora-harness/src/inspection/rules/er-rules.ts packages/pintora-harness/src/inspection/rules/sequence-rules.ts packages/pintora-harness/src/exit-codes.ts packages/pintora-harness/src/index.ts packages/pintora-harness/src/__tests__/case-registry.spec.ts packages/pintora-harness/src/__tests__/inspect-svg.spec.ts
git commit -m "feat: migrate harness contracts and inspection core"
```

### Task 3: Add Render Adapter and Migrate `render-svg`

**Files:**
- Create: `packages/pintora-harness/src/rendering/render-adapter.ts`
- Create: `packages/pintora-harness/src/rendering/render-svg.ts`
- Test: `packages/pintora-harness/src/__tests__/render-svg.spec.ts`
- Modify: `packages/pintora-harness/src/index.ts`

- [ ] **Step 1: Write the failing render-svg migration test**

```ts
// packages/pintora-harness/src/__tests__/render-svg.spec.ts
+import * as fs from 'node:fs'
+import * as os from 'node:os'
+import * as path from 'node:path'
+import { runHarnessRenderSvg } from '../rendering/render-svg'
+
+describe('runHarnessRenderSvg', () => {
+  it('renders svg from a registry case into the target file', async () => {
+    const outDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pintora-harness-'))
+    const outFile = path.join(outDir, 'render.svg')
+
+    const result = await runHarnessRenderSvg({
+      cwd: process.cwd(),
+      caseId: 'er.relationship-spacing-01',
+      outFile,
+    })
+
+    expect(result.status).toBe('ok')
+    expect(result.diagramType).toBe('er')
+    expect(fs.readFileSync(outFile, 'utf8')).toContain('<svg')
+  })
+})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm exec jest packages/pintora-harness/src/__tests__/render-svg.spec.ts --runInBand`
Expected: FAIL with module-not-found for `../rendering/render-svg`

- [ ] **Step 3: Add a harness-local render adapter instead of importing `@pintora/cli`**

```ts
// packages/pintora-harness/src/rendering/render-adapter.ts
import { pintoraStandalone } from '@pintora/standalone'

export async function renderHarnessSvg(code: string) {
  const result = await pintoraStandalone.renderTo(code, {
    renderer: 'svg',
  })
  return result as string
}
```

If `renderTo` is not the exact existing standalone API, replace it with the smallest direct runtime call that produces SVG without importing from `packages/pintora-cli/src/*`. The implementation must stay inside `@pintora/harness`.

```ts
// packages/pintora-harness/src/rendering/render-svg.ts
import * as fs from 'node:fs'
import * as path from 'node:path'
import { readHarnessSource, resolveHarnessInput } from '../cases/read-input'
import { renderHarnessSvg } from './render-adapter'

export async function runHarnessRenderSvg(opts: {
  cwd: string
  caseId?: string
  inputFile?: string
  outFile: string
}) {
  const resolved = resolveHarnessInput(opts)
  const code = readHarnessSource(resolved.inputFile)
  const svg = await renderHarnessSvg(code)

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

- [ ] **Step 4: Export render-svg from the package index**

```ts
// packages/pintora-harness/src/index.ts
export { runHarnessRenderSvg } from './rendering/render-svg'
```

- [ ] **Step 5: Run the render test to verify it passes**

Run: `pnpm exec jest packages/pintora-harness/src/__tests__/render-svg.spec.ts --runInBand`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add packages/pintora-harness/src/rendering/render-adapter.ts packages/pintora-harness/src/rendering/render-svg.ts packages/pintora-harness/src/index.ts packages/pintora-harness/src/__tests__/render-svg.spec.ts
git commit -m "feat: migrate harness render path"
```

### Task 4: Migrate Browser Capture and Summary Modules

**Files:**
- Create: `packages/pintora-harness/src/browser/browser-contracts.ts`
- Create: `packages/pintora-harness/src/browser/browser-preview-url.ts`
- Create: `packages/pintora-harness/src/browser/browser-capture.ts`
- Create: `packages/pintora-harness/src/browser/capture-browser.ts`
- Create: `packages/pintora-harness/src/summary/artifact-reader.ts`
- Create: `packages/pintora-harness/src/summary/summary-rules.ts`
- Create: `packages/pintora-harness/src/summary/summarize-case.ts`
- Test: `packages/pintora-harness/src/__tests__/browser-preview-url.spec.ts`
- Test: `packages/pintora-harness/src/__tests__/capture-browser.spec.ts`
- Test: `packages/pintora-harness/src/__tests__/artifact-reader.spec.ts`
- Test: `packages/pintora-harness/src/__tests__/summary-rules.spec.ts`
- Test: `packages/pintora-harness/src/__tests__/summarize-case.spec.ts`
- Modify: `packages/pintora-harness/src/index.ts`

- [ ] **Step 1: Write the failing migrated module tests**

```ts
// packages/pintora-harness/src/__tests__/summary-rules.spec.ts
+import { buildHarnessSummary } from '../summary/summary-rules'
+
+describe('buildHarnessSummary', () => {
+  it('maps suspicious runs without browser output to capture_browser', () => {
+    const summary = buildHarnessSummary({
+      run_id: 'run-1',
+      case_id: null,
+      diagram_type: null,
+      artifacts: {
+        svg: 'render.svg',
+        png: null,
+        browser_png: null,
+        dom_html: null,
+        metrics: 'metrics.json',
+        findings: 'findings.json',
+      },
+      metrics: { viewBox: { x: 0, y: 0, width: 100, height: 80 }, rootChildCount: 1 },
+      findings: [{ message: 'first finding' }],
+    })
+
+    expect(summary.status).toBe('suspicious')
+    expect(summary.next_action).toBe('capture_browser')
+  })
+})
```

```ts
// packages/pintora-harness/src/__tests__/summarize-case.spec.ts
+import * as fs from 'node:fs'
+import * as os from 'node:os'
+import * as path from 'node:path'
+import { runHarnessSummarizeCase } from '../summary/summarize-case'
+
+describe('runHarnessSummarizeCase', () => {
+  it('writes summary.json and returns summary file metadata', async () => {
+    const artifactsDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pintora-harness-summary-'))
+    const outFile = path.join(artifactsDir, 'summary.json')
+    fs.writeFileSync(path.join(artifactsDir, 'metrics.json'), JSON.stringify({ viewBox: { x: 0, y: 0, width: 100, height: 80 }, rootChildCount: 1 }, null, 2))
+    fs.writeFileSync(path.join(artifactsDir, 'findings.json'), JSON.stringify([], null, 2))
+    fs.writeFileSync(path.join(artifactsDir, 'render.svg'), '<svg></svg>')
+
+    const result = await runHarnessSummarizeCase({ artifactsDir, outFile })
+
+    expect(result.status).toBe('ok')
+    expect(result.nextAction).toBe('done')
+    expect(result.summary).toBe('summary.json')
+  })
+})
```

Also port the current browser-preview, capture-browser, and artifact-reader tests into the new package paths before implementation.

- [ ] **Step 2: Run the tests to verify they fail**

Run: `pnpm exec jest packages/pintora-harness/src/__tests__/browser-preview-url.spec.ts packages/pintora-harness/src/__tests__/capture-browser.spec.ts packages/pintora-harness/src/__tests__/artifact-reader.spec.ts packages/pintora-harness/src/__tests__/summary-rules.spec.ts packages/pintora-harness/src/__tests__/summarize-case.spec.ts --runInBand`
Expected: FAIL with module-not-found errors for the new package modules

- [ ] **Step 3: Migrate the browser and summary modules with package-local imports**

```ts
// packages/pintora-harness/src/browser/capture-browser.ts
import { DEFAULT_CAPTURE_ARTIFACTS, DEFAULT_CAPTURE_VIEWPORT } from './browser-contracts'
import { capturePreviewArtifacts } from './browser-capture'
import { buildBrowserPreviewUrl } from './browser-preview-url'
import { readHarnessSource, resolveHarnessInput } from '../cases/read-input'

export async function runHarnessCaptureBrowser(opts: {
  cwd: string
  caseId?: string
  inputFile?: string
  outDir: string
  baseUrl?: string
  viewport?: { width: number; height: number }
}) {
  const resolved = resolveHarnessInput({ cwd: opts.cwd, caseId: opts.caseId, inputFile: opts.inputFile })
  const code = readHarnessSource(resolved.inputFile)
  const previewUrl = buildBrowserPreviewUrl({ code, baseUrl: opts.baseUrl })

  await capturePreviewArtifacts({
    previewUrl,
    outDir: opts.outDir,
    viewport: opts.viewport || DEFAULT_CAPTURE_VIEWPORT,
  })

  return {
    status: 'ok' as const,
    artifacts: [DEFAULT_CAPTURE_ARTIFACTS.screenshot, DEFAULT_CAPTURE_ARTIFACTS.dom],
    renderer: 'svg-preview' as const,
    previewUrl,
  }
}
```

```ts
// packages/pintora-harness/src/summary/summarize-case.ts
import * as fs from 'node:fs'
import * as path from 'node:path'
import { readHarnessArtifacts } from './artifact-reader'
import { statusToExitCode } from '../exit-codes'
import { buildHarnessSummary } from './summary-rules'

export async function runHarnessSummarizeCase(opts: { artifactsDir: string; outFile: string }) {
  const { artifacts, findings, metrics } = readHarnessArtifacts({ artifactsDir: opts.artifactsDir })
  const summaryData = buildHarnessSummary({
    run_id: path.basename(opts.artifactsDir),
    case_id: null,
    diagram_type: null,
    artifacts,
    metrics,
    findings,
  })

  fs.mkdirSync(path.dirname(opts.outFile), { recursive: true })
  fs.writeFileSync(opts.outFile, JSON.stringify(summaryData, null, 2))

  return {
    status: summaryData.status,
    nextAction: summaryData.next_action,
    summary: path.basename(opts.outFile),
    exitCode: statusToExitCode(summaryData.status),
  }
}
```

For the remaining files in this task, port the current implementation with import path rewrites only. Do not change command semantics in this migration step.

- [ ] **Step 4: Export the migrated browser and summary APIs**

```ts
// packages/pintora-harness/src/index.ts
export { runHarnessCaptureBrowser } from './browser/capture-browser'
export { runHarnessSummarizeCase } from './summary/summarize-case'
export { buildHarnessSummary } from './summary/summary-rules'
export { readHarnessArtifacts } from './summary/artifact-reader'
```

- [ ] **Step 5: Run the focused tests to verify they pass**

Run: `pnpm exec jest packages/pintora-harness/src/__tests__/browser-preview-url.spec.ts packages/pintora-harness/src/__tests__/capture-browser.spec.ts packages/pintora-harness/src/__tests__/artifact-reader.spec.ts packages/pintora-harness/src/__tests__/summary-rules.spec.ts packages/pintora-harness/src/__tests__/summarize-case.spec.ts --runInBand`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add packages/pintora-harness/src/browser/browser-contracts.ts packages/pintora-harness/src/browser/browser-preview-url.ts packages/pintora-harness/src/browser/browser-capture.ts packages/pintora-harness/src/browser/capture-browser.ts packages/pintora-harness/src/summary/artifact-reader.ts packages/pintora-harness/src/summary/summary-rules.ts packages/pintora-harness/src/summary/summarize-case.ts packages/pintora-harness/src/index.ts packages/pintora-harness/src/__tests__/browser-preview-url.spec.ts packages/pintora-harness/src/__tests__/capture-browser.spec.ts packages/pintora-harness/src/__tests__/artifact-reader.spec.ts packages/pintora-harness/src/__tests__/summary-rules.spec.ts packages/pintora-harness/src/__tests__/summarize-case.spec.ts
git commit -m "feat: migrate harness browser and summary modules"
```

### Task 5: Wire `pintora-harness` CLI and Migrate End-to-End Coverage

**Files:**
- Modify: `packages/pintora-harness/src/cli.ts`
- Create: `packages/pintora-harness/src/__tests__/harness-e2e.spec.ts`
- Modify: `packages/pintora-harness/src/__tests__/cli.spec.ts`
- Modify: `docs/harness/README.md`

- [ ] **Step 1: Write the failing CLI behavior tests**

```ts
// packages/pintora-harness/src/__tests__/cli.spec.ts
+describe('pintora-harness cli commands', () => {
+  const originalArgv = process.argv.slice()
+
+  afterEach(() => {
+    process.argv = originalArgv.slice()
+    jest.restoreAllMocks()
+    jest.resetModules()
+  })
+
+  it('prints summarize-case result with status, nextAction, and summary', async () => {
+    process.argv = ['node', 'pintora-harness', 'summarize-case', '--artifacts', '/tmp/a', '--out', '/tmp/a/summary.json']
+    const stdoutSpy = jest.spyOn(process.stdout, 'write').mockImplementation(() => true)
+
+    jest.doMock('../summary/summarize-case', () => ({
+      runHarnessSummarizeCase: jest.fn(async () => ({
+        status: 'suspicious',
+        nextAction: 'capture_browser',
+        summary: 'summary.json',
+        exitCode: 10,
+      })),
+    }))
+
+    jest.isolateModules(() => {
+      require('../cli')
+    })
+
+    await new Promise(resolve => setImmediate(resolve))
+    expect(stdoutSpy).toHaveBeenCalledWith(expect.stringContaining('"nextAction":"capture_browser"'))
+    expect(process.exitCode).toBe(10)
+  })
+})
```

```ts
// packages/pintora-harness/src/__tests__/harness-e2e.spec.ts
+import * as fs from 'node:fs'
+import * as os from 'node:os'
+import * as path from 'node:path'
+import { runHarnessInspectSvg } from '../inspection/inspect-svg'
+import { runHarnessRenderSvg } from '../rendering/render-svg'
+
+describe('harness e2e', () => {
+  it('renders and inspects a registry case with machine-readable artifacts', async () => {
+    const outDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pintora-harness-e2e-'))
+    const svgFile = path.join(outDir, 'render.svg')
+
+    await runHarnessRenderSvg({ cwd: process.cwd(), caseId: 'er.relationship-spacing-01', outFile: svgFile })
+    const summary = await runHarnessInspectSvg({ cwd: process.cwd(), svgFile, caseId: 'er.relationship-spacing-01', outDir })
+
+    expect(summary.artifacts).toEqual(['metrics.json', 'findings.json'])
+  })
+})
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `pnpm exec jest packages/pintora-harness/src/__tests__/cli.spec.ts packages/pintora-harness/src/__tests__/harness-e2e.spec.ts --runInBand`
Expected: FAIL because the CLI does not yet register the harness commands

- [ ] **Step 3: Implement the full `pintora-harness` CLI command surface**

```ts
// packages/pintora-harness/src/cli.ts
import consola from 'consola'
import yargs from 'yargs'
import { statusToExitCode } from './exit-codes'
import { runHarnessCaptureBrowser } from './browser/capture-browser'
import { runHarnessInspectSvg } from './inspection/inspect-svg'
import { runHarnessRenderSvg } from './rendering/render-svg'
import { runHarnessSummarizeCase } from './summary/summarize-case'

const CWD = process.cwd()

yargs
  .scriptName('pintora-harness')
  .command({
    command: 'render-svg',
    builder: {
      case: { type: 'string' },
      input: { type: 'string' },
      out: { type: 'string', demandOption: true },
    },
    handler: async args => {
      try {
        const result = await runHarnessRenderSvg({ cwd: CWD, caseId: args.case as string | undefined, inputFile: args.input as string | undefined, outFile: args.out as string })
        process.stdout.write(`${JSON.stringify(result)}\n`)
      } catch (error) {
        consola.error(error)
        process.exitCode = 1
      }
    },
  })
  .command({
    command: 'inspect-svg',
    builder: {
      in: { type: 'string', demandOption: true },
      case: { type: 'string' },
      'out-dir': { type: 'string', demandOption: true },
    },
    handler: async args => {
      try {
        const result = await runHarnessInspectSvg({ cwd: CWD, svgFile: args.in as string, caseId: args.case as string | undefined, outDir: args['out-dir'] as string })
        process.stdout.write(`${JSON.stringify(result)}\n`)
        process.exitCode = statusToExitCode(result.status)
      } catch (error) {
        consola.error(error)
        process.exitCode = 1
      }
    },
  })
  .command({
    command: 'capture-browser',
    builder: {
      case: { type: 'string' },
      input: { type: 'string' },
      'out-dir': { type: 'string', demandOption: true },
      'base-url': { type: 'string' },
      viewport: { type: 'string' },
    },
    handler: async args => {
      try {
        const result = await runHarnessCaptureBrowser({ cwd: CWD, caseId: args.case as string | undefined, inputFile: args.input as string | undefined, outDir: args['out-dir'] as string, baseUrl: args['base-url'] as string | undefined })
        process.stdout.write(`${JSON.stringify(result)}\n`)
      } catch (error) {
        consola.error(error)
        process.exitCode = 1
      }
    },
  })
  .command({
    command: 'summarize-case',
    builder: {
      artifacts: { type: 'string', demandOption: true },
      out: { type: 'string', demandOption: true },
    },
    handler: async args => {
      try {
        const result = await runHarnessSummarizeCase({ artifactsDir: args.artifacts as string, outFile: args.out as string })
        process.stdout.write(`${JSON.stringify(result)}\n`)
        process.exitCode = result.exitCode
      } catch (error) {
        consola.error(error)
        process.exitCode = 1
      }
    },
  })
  .demandCommand(1)
  .help()
  .showHelpOnFail(true)
  .parse()
```

Update README examples to use `pintora-harness ...` instead of `pintora harness ...`.

- [ ] **Step 4: Run the focused tests to verify they pass**

Run: `pnpm exec jest packages/pintora-harness/src/__tests__/cli.spec.ts packages/pintora-harness/src/__tests__/harness-e2e.spec.ts --runInBand`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add packages/pintora-harness/src/cli.ts packages/pintora-harness/src/__tests__/cli.spec.ts packages/pintora-harness/src/__tests__/harness-e2e.spec.ts docs/harness/README.md
git commit -m "feat: add pintora harness cli"
```

### Task 6: Remove Harness from `@pintora/cli` and Verify Command Removal

**Files:**
- Modify: `packages/pintora-cli/src/cli.ts`
- Modify: `packages/pintora-cli/package.json`
- Delete: `packages/pintora-cli/src/harness/`
- Delete: `packages/pintora-cli/src/__tests__/harness/`
- Test: `packages/pintora-cli/src/__tests__/cli-remove-harness.spec.ts`

- [ ] **Step 1: Write the failing harness-removal test**

```ts
// packages/pintora-cli/src/__tests__/cli-remove-harness.spec.ts
+describe('pintora cli without harness', () => {
+  const originalArgv = process.argv.slice()
+
+  afterEach(() => {
+    process.argv = originalArgv.slice()
+    jest.restoreAllMocks()
+    jest.resetModules()
+  })
+
+  it('does not expose the harness command group', () => {
+    process.argv = ['node', 'pintora', 'harness', '--help']
+    const stderrSpy = jest.spyOn(process.stderr, 'write').mockImplementation(() => true)
+
+    jest.isolateModules(() => {
+      require('../cli')
+    })
+
+    expect(stderrSpy).toHaveBeenCalled()
+  })
+})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm --filter @pintora/cli exec jest src/__tests__/cli-remove-harness.spec.ts --runInBand`
Expected: FAIL because `@pintora/cli` still exposes harness

- [ ] **Step 3: Remove harness command wiring and harness-only dependencies from `@pintora/cli`**

```ts
// packages/pintora-cli/src/cli.ts
import type { PintoraConfig } from '@pintora/standalone'
import consola from 'consola'
import * as fs from 'node:fs'
import * as mime from 'mime-types'
import * as path from 'node:path'
import yargs from 'yargs'
import { SUPPORTED_MIME_TYPES } from './const'

const CWD = process.cwd()

// keep only the general render command in this file
```

Delete the `harness <command>` yargs group entirely.

```json
// packages/pintora-cli/package.json
{
  "dependencies": {
    "@pintora/core": "workspace:^0.8.1",
    "@pintora/renderer": "workspace:^0.8.1",
    "@pintora/standalone": "workspace:^0.8.1",
    "canvas": "^3.0.1",
    "consola": "^3.0.0",
    "mime-types": "^3.0.0",
    "yargs": "^17.7.2"
  }
}
```

Remove harness-only runtime files and harness-only tests from `packages/pintora-cli`.

- [ ] **Step 4: Run the focused removal test to verify it passes**

Run: `pnpm --filter @pintora/cli exec jest src/__tests__/cli-remove-harness.spec.ts --runInBand`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add packages/pintora-cli/src/cli.ts packages/pintora-cli/package.json packages/pintora-cli/src/__tests__/cli-remove-harness.spec.ts
git rm -r packages/pintora-cli/src/harness packages/pintora-cli/src/__tests__/harness
git commit -m "refactor: remove harness from pintora cli"
```

### Task 7: Final Verification of New Package and Removed Old Surface

**Files:**
- Verify only; no new files expected unless docs need a final fix

- [ ] **Step 1: Compile the new harness package**

Run: `pnpm --filter @pintora/harness compile`
Expected: PASS

- [ ] **Step 2: Run the new harness package tests**

Run: `pnpm --filter @pintora/harness test -- --runInBand`
Expected: PASS

- [ ] **Step 3: Run the remaining cli package tests**

Run: `pnpm --filter @pintora/cli test -- --runInBand`
Expected: PASS

- [ ] **Step 4: Manual smoke the new extracted CLI**

Run:

```bash
node packages/pintora-harness/lib/cli.js render-svg --case er.relationship-spacing-01 --out artifacts/harness/extracted/render.svg
node packages/pintora-harness/lib/cli.js inspect-svg --in artifacts/harness/extracted/render.svg --case er.relationship-spacing-01 --out-dir artifacts/harness/extracted
node packages/pintora-harness/lib/cli.js summarize-case --artifacts artifacts/harness/extracted --out artifacts/harness/extracted/summary.json
```

Expected:
- `render.svg`, `metrics.json`, `findings.json`, `summary.json` exist
- summarize stdout contains `status`, `nextAction`, and `summary`
- summarize exit code is `0`, `10`, or `20`

- [ ] **Step 5: Verify the old CLI surface is gone**

Run:

```bash
node packages/pintora-cli/lib/cli.js harness --help
```

Expected:
- command fails cleanly or shows unknown-command output
- no harness subcommands remain available

- [ ] **Step 6: Commit final doc or verification adjustments if any**

```bash
git add docs/harness/README.md
git commit -m "docs: finalize extracted harness docs"
```

### Verification Checklist Before Completion

- [ ] `pnpm --filter @pintora/harness compile`
- [ ] `pnpm --filter @pintora/harness test -- --runInBand`
- [ ] `pnpm --filter @pintora/cli test -- --runInBand`
- [ ] Manual smoke through `packages/pintora-harness/lib/cli.js`
- [ ] Verify `packages/pintora-cli/lib/cli.js harness --help` no longer exposes harness

### Self-Review

Spec coverage:
- new package creation is covered in Task 1
- contract/core migration is covered in Task 2
- render adapter extraction is covered in Task 3
- browser and summary migration is covered in Task 4
- new `pintora-harness` CLI is covered in Task 5
- old `pintora harness ...` removal is covered in Task 6
- verification and command-surface removal are covered in Task 7

Placeholder scan:
- no `TBD`, `TODO`, or vague placeholder steps remain
- every code-changing step includes concrete code or explicit migration target
- every validation step includes an exact command and expected result

Type consistency:
- `HarnessStatus`, `HarnessCase`, and exit code mapping stay under the new package
- `runHarnessRenderSvg`, `runHarnessInspectSvg`, `runHarnessCaptureBrowser`, and `runHarnessSummarizeCase` are defined once and reused consistently
- `pintora-harness` is the only new CLI name used in the plan
