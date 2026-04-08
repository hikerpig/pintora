# Pintora Harness Capture Browser Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a `pintora harness capture-browser` command that captures stable browser evidence from an already-running preview server and writes `browser.png` plus `dom.html`.

**Architecture:** Keep the command surface in `@pintora/cli`, but isolate browser-specific behavior into dedicated harness modules so the implementation can later move out of the package with minimal churn. The command resolves a case or raw input, builds a stable preview URL, drives a headless browser to wait for a settled `svg`, captures the diagram container, serializes DOM, and emits machine-readable stdout.

**Tech Stack:** TypeScript, yargs, Playwright, existing harness registry/input helpers, Jest

---

### File Structure

**Create:**
- `packages/pintora-cli/src/harness/browser-contracts.ts`
- `packages/pintora-cli/src/harness/browser-preview-url.ts`
- `packages/pintora-cli/src/harness/browser-capture.ts`
- `packages/pintora-cli/src/harness/capture-browser.ts`
- `packages/pintora-cli/src/__tests__/harness/browser-preview-url.spec.ts`
- `packages/pintora-cli/src/__tests__/harness/capture-browser.spec.ts`

**Modify:**
- `packages/pintora-cli/package.json`
- `packages/pintora-cli/src/cli.ts`
- `docs/harness/README.md`

### Design Notes Locked In

- Default preview URL: `http://localhost:3001/demo/preview/`
- Override option: `--base-url`
- Default viewport: `1440x960`
- Always force `renderer=svg`
- Always force `e2e=true`
- Default outputs: `browser.png` and `dom.html`
- Command does not manage preview server lifecycle
- Command returns `0` on successful capture and `1` on operational failure

### Task 1: Add Preview URL Builder and Browser Contracts

**Files:**
- Create: `packages/pintora-cli/src/harness/browser-contracts.ts`
- Create: `packages/pintora-cli/src/harness/browser-preview-url.ts`
- Test: `packages/pintora-cli/src/__tests__/harness/browser-preview-url.spec.ts`

- [ ] **Step 1: Write the failing URL builder tests**

```ts
// packages/pintora-cli/src/__tests__/harness/browser-preview-url.spec.ts
import { buildBrowserPreviewUrl, DEFAULT_PREVIEW_BASE_URL } from '../../harness/browser-preview-url'

describe('buildBrowserPreviewUrl', () => {
  it('uses the default preview base url and required params', () => {
    const url = buildBrowserPreviewUrl({
      code: 'erDiagram\n  A ||--o{ B : owns',
    })

    expect(url.startsWith(DEFAULT_PREVIEW_BASE_URL)).toBe(true)
    expect(url).toContain('renderer=svg')
    expect(url).toContain('e2e=true')
    expect(url).toContain('code=')
  })

  it('honors an explicit base url override', () => {
    const url = buildBrowserPreviewUrl({
      code: 'sequenceDiagram\n  a->>b: ping',
      baseUrl: 'http://127.0.0.1:4010/demo/preview/',
    })

    expect(url.startsWith('http://127.0.0.1:4010/demo/preview/')).toBe(true)
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm --filter @pintora/cli exec jest src/__tests__/harness/browser-preview-url.spec.ts --runInBand`

Expected: FAIL with module-not-found for `../../harness/browser-preview-url`

- [ ] **Step 3: Add the browser contracts module**

```ts
// packages/pintora-cli/src/harness/browser-contracts.ts
export const DEFAULT_PREVIEW_BASE_URL = 'http://localhost:3001/demo/preview/'
export const DEFAULT_CAPTURE_VIEWPORT = { width: 1440, height: 960 }
export const DEFAULT_CAPTURE_ARTIFACTS = {
  screenshot: 'browser.png',
  dom: 'dom.html',
}

export type CaptureViewport = {
  width: number
  height: number
}
```

- [ ] **Step 4: Implement the pure preview URL builder**

```ts
// packages/pintora-cli/src/harness/browser-preview-url.ts
import { encodeForUrl } from '@pintora/core'
import { DEFAULT_PREVIEW_BASE_URL } from './browser-contracts'

export { DEFAULT_PREVIEW_BASE_URL } from './browser-contracts'

export function buildBrowserPreviewUrl(opts: { code: string; baseUrl?: string }) {
  const baseUrl = opts.baseUrl || DEFAULT_PREVIEW_BASE_URL
  const url = new URL(baseUrl)
  url.searchParams.set('code', encodeForUrl(opts.code))
  url.searchParams.set('renderer', 'svg')
  url.searchParams.set('e2e', 'true')
  return url.toString()
}
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `pnpm --filter @pintora/cli exec jest src/__tests__/harness/browser-preview-url.spec.ts --runInBand`

Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add packages/pintora-cli/src/harness/browser-contracts.ts packages/pintora-cli/src/harness/browser-preview-url.ts packages/pintora-cli/src/__tests__/harness/browser-preview-url.spec.ts
git commit -m "feat: add harness browser preview url builder"
```

### Task 2: Add Playwright Dependency and Browser Driver Boundary

**Files:**
- Modify: `packages/pintora-cli/package.json`
- Create: `packages/pintora-cli/src/harness/browser-capture.ts`
- Test: `packages/pintora-cli/src/__tests__/harness/capture-browser.spec.ts`

- [ ] **Step 1: Write the failing browser orchestration test**

```ts
// packages/pintora-cli/src/__tests__/harness/capture-browser.spec.ts
import * as fs from 'node:fs'
import * as os from 'node:os'
import * as path from 'node:path'
import { runHarnessCaptureBrowser } from '../../harness/capture-browser'

jest.mock('../../harness/browser-capture', () => ({
  capturePreviewArtifacts: jest.fn(async ({ outDir }) => {
    fs.mkdirSync(outDir, { recursive: true })
    fs.writeFileSync(path.join(outDir, 'browser.png'), 'png-bytes')
    fs.writeFileSync(path.join(outDir, 'dom.html'), '<html></html>')
    return {
      screenshotPath: path.join(outDir, 'browser.png'),
      domPath: path.join(outDir, 'dom.html'),
    }
  }),
}))

describe('runHarnessCaptureBrowser', () => {
  it('writes browser artifacts for a registry case', async () => {
    const outDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pintora-capture-browser-'))
    const result = await runHarnessCaptureBrowser({
      cwd: process.cwd(),
      caseId: 'er.relationship-spacing-01',
      outDir,
    })

    expect(result.status).toBe('ok')
    expect(fs.existsSync(path.join(outDir, 'browser.png'))).toBe(true)
    expect(fs.existsSync(path.join(outDir, 'dom.html'))).toBe(true)
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm --filter @pintora/cli exec jest src/__tests__/harness/capture-browser.spec.ts --runInBand`

Expected: FAIL with module-not-found for `../../harness/capture-browser`

- [ ] **Step 3: Add the Playwright package to `@pintora/cli`**

```json
// packages/pintora-cli/package.json
{
  "dependencies": {
    "playwright": "^1.55.0"
  }
}
```

The package should be a direct dependency of `@pintora/cli`, not of `demo`, because the harness command lives in the CLI package and must be portable when moved later.

- [ ] **Step 4: Add the low-level browser driver boundary**

```ts
// packages/pintora-cli/src/harness/browser-capture.ts
import * as fs from 'node:fs'
import * as path from 'node:path'
import { chromium } from 'playwright'
import { CaptureViewport, DEFAULT_CAPTURE_ARTIFACTS, DEFAULT_CAPTURE_VIEWPORT } from './browser-contracts'

export async function capturePreviewArtifacts(opts: {
  previewUrl: string
  outDir: string
  viewport?: CaptureViewport
}) {
  const viewport = opts.viewport || DEFAULT_CAPTURE_VIEWPORT
  const browser = await chromium.launch({ headless: true })
  const page = await browser.newPage({ viewport, deviceScaleFactor: 1 })

  try {
    await page.goto(opts.previewUrl, { waitUntil: 'domcontentloaded' })
    await page.waitForSelector('.preview')
    await page.evaluate(async () => {
      await document.fonts.ready
    })
    await page.waitForSelector('.preview svg')

    const screenshotPath = path.join(opts.outDir, DEFAULT_CAPTURE_ARTIFACTS.screenshot)
    const domPath = path.join(opts.outDir, DEFAULT_CAPTURE_ARTIFACTS.dom)
    fs.mkdirSync(opts.outDir, { recursive: true })

    await page.locator('.preview').screenshot({ path: screenshotPath })
    fs.writeFileSync(domPath, await page.content())

    return { screenshotPath, domPath }
  } finally {
    await page.close()
    await browser.close()
  }
}
```

- [ ] **Step 5: Run the failing test again and confirm it now fails on missing `capture-browser` orchestration, not on missing browser driver**

Run: `pnpm --filter @pintora/cli exec jest src/__tests__/harness/capture-browser.spec.ts --runInBand`

Expected: FAIL with module-not-found for `../../harness/capture-browser`

- [ ] **Step 6: Install dependencies**

Run: `pnpm install`

Expected: lockfile and workspace dependencies update cleanly

- [ ] **Step 7: Commit**

```bash
git add packages/pintora-cli/package.json pnpm-lock.yaml packages/pintora-cli/src/harness/browser-capture.ts packages/pintora-cli/src/__tests__/harness/capture-browser.spec.ts
git commit -m "feat: add harness browser capture driver"
```

### Task 3: Implement `capture-browser` Orchestration and CLI Wiring

**Files:**
- Modify: `packages/pintora-cli/src/cli.ts`
- Create: `packages/pintora-cli/src/harness/capture-browser.ts`
- Test: `packages/pintora-cli/src/__tests__/harness/capture-browser.spec.ts`

- [ ] **Step 1: Implement the command orchestration function**

```ts
// packages/pintora-cli/src/harness/capture-browser.ts
import * as path from 'node:path'
import { DEFAULT_CAPTURE_ARTIFACTS, DEFAULT_CAPTURE_VIEWPORT } from './browser-contracts'
import { capturePreviewArtifacts } from './browser-capture'
import { buildBrowserPreviewUrl } from './browser-preview-url'
import { readHarnessSource, resolveHarnessInput } from './read-input'

export async function runHarnessCaptureBrowser(opts: {
  cwd: string
  caseId?: string
  inputFile?: string
  outDir: string
  baseUrl?: string
  viewport?: { width: number; height: number }
}) {
  const resolved = resolveHarnessInput({
    cwd: opts.cwd,
    caseId: opts.caseId,
    inputFile: opts.inputFile,
  })
  const code = readHarnessSource(resolved.inputFile)
  const previewUrl = buildBrowserPreviewUrl({
    code,
    baseUrl: opts.baseUrl,
  })

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

- [ ] **Step 2: Re-run the capture orchestration test**

Run: `pnpm --filter @pintora/cli exec jest src/__tests__/harness/capture-browser.spec.ts --runInBand`

Expected: PASS

- [ ] **Step 3: Wire the new CLI subcommand**

```ts
// packages/pintora-cli/src/cli.ts
type HarnessCaptureBrowserArgs = {
  case?: string
  input?: string
  'out-dir': string
  'base-url'?: string
  viewport?: string
}
```

```ts
// packages/pintora-cli/src/cli.ts
.command<HarnessCaptureBrowserArgs>({
  command: 'capture-browser',
  describe: 'Capture browser evidence from the preview surface',
  builder: {
    case: { describe: 'Harness case id', type: 'string' },
    input: { describe: 'Input file path', type: 'string' },
    'out-dir': { describe: 'Output artifact directory', type: 'string', demandOption: true },
    'base-url': { describe: 'Preview base URL', type: 'string' },
    viewport: { describe: 'Viewport formatted as WIDTHxHEIGHT', type: 'string' },
  },
  handler: handleHarnessCaptureBrowserCommand,
})
```

```ts
// packages/pintora-cli/src/cli.ts
async function handleHarnessCaptureBrowserCommand(args: HarnessCaptureBrowserArgs) {
  try {
    const result = await runHarnessCaptureBrowser({
      cwd: CWD,
      caseId: args.case,
      inputFile: args.input,
      outDir: args['out-dir'],
      baseUrl: args['base-url'],
      viewport: parseViewport(args.viewport),
    })
    process.stdout.write(`${JSON.stringify(result)}\n`)
  } catch (error) {
    consola.error(error)
    process.exitCode = 1
  }
}
```

- [ ] **Step 4: Add a viewport parser helper in `cli.ts`**

```ts
function parseViewport(input?: string) {
  if (!input) return undefined
  const match = /^(\d+)x(\d+)$/.exec(input)
  if (!match) {
    throw new Error(`Invalid viewport: ${input}. Expected WIDTHxHEIGHT`)
  }
  return {
    width: Number.parseInt(match[1], 10),
    height: Number.parseInt(match[2], 10),
  }
}
```

- [ ] **Step 5: Run focused harness tests**

Run: `pnpm --filter @pintora/cli exec jest src/__tests__/harness/browser-preview-url.spec.ts src/__tests__/harness/capture-browser.spec.ts --runInBand`

Expected: PASS

- [ ] **Step 6: Run full CLI tests**

Run: `pnpm --filter @pintora/cli test -- --runInBand`

Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add packages/pintora-cli/src/cli.ts packages/pintora-cli/src/harness/capture-browser.ts packages/pintora-cli/src/__tests__/harness/browser-preview-url.spec.ts packages/pintora-cli/src/__tests__/harness/capture-browser.spec.ts
git commit -m "feat: add harness capture-browser command"
```

### Task 4: Harden Wait Strategy and Document Manual Smoke Usage

**Files:**
- Modify: `packages/pintora-cli/src/harness/browser-capture.ts`
- Modify: `docs/harness/README.md`

- [ ] **Step 1: Write a failing wait-strategy test**

Add a focused unit test that verifies the browser driver calls its wait steps in this order:

1. preview root
2. `document.fonts.ready`
3. preview `svg`
4. screenshot
5. DOM export

The test can mock the Playwright page object rather than launching a real browser.

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm --filter @pintora/cli exec jest src/__tests__/harness/capture-browser.spec.ts --runInBand`

Expected: FAIL because the wait order assertion is not yet encoded

- [ ] **Step 3: Add settled-size waiting to `browser-capture.ts`**

```ts
async function waitForStablePreview(page: Page) {
  await page.waitForSelector('.preview')
  await page.evaluate(async () => {
    await document.fonts.ready
  })
  await page.waitForSelector('.preview svg')

  const locator = page.locator('.preview')
  let lastBox: { width: number; height: number } | null = null
  for (let i = 0; i < 5; i++) {
    const box = await locator.boundingBox()
    if (box && lastBox && box.width === lastBox.width && box.height === lastBox.height) {
      return
    }
    lastBox = box ? { width: box.width, height: box.height } : null
    await page.waitForTimeout(50)
  }
}
```

- [ ] **Step 4: Update the README with Phase 2 command docs**

```md
## Browser Capture

- `pintora harness capture-browser --case er.relationship-spacing-01 --out-dir artifacts/harness/dev`
- `pintora harness capture-browser --input ./tmp/case.pintora --out-dir artifacts/harness/dev --base-url http://localhost:3001/demo/preview/ --viewport 1440x960`

Outputs:

- `browser.png`
- `dom.html`
```

- [ ] **Step 5: Run full CLI tests again**

Run: `pnpm --filter @pintora/cli test -- --runInBand`

Expected: PASS

- [ ] **Step 6: Manual smoke test against a running preview server**

Prerequisite:
- start demo preview separately with `pnpm demo:dev`

Run:

```bash
node packages/pintora-cli/lib/cli.js harness capture-browser \
  --case er.relationship-spacing-01 \
  --out-dir artifacts/harness/manual-capture
```

Expected:
- exit code `0`
- `artifacts/harness/manual-capture/browser.png` exists
- `artifacts/harness/manual-capture/dom.html` exists
- stdout JSON contains `"renderer":"svg-preview"`

- [ ] **Step 7: Commit**

```bash
git add packages/pintora-cli/src/harness/browser-capture.ts docs/harness/README.md
git commit -m "feat: stabilize harness browser capture"
```

### Verification Checklist Before Completion

- [ ] `pnpm install`
- [ ] `pnpm --filter @pintora/cli compile`
- [ ] `pnpm --filter @pintora/cli test -- --runInBand`
- [ ] Manual smoke with a running preview server:

```bash
node packages/pintora-cli/lib/cli.js harness capture-browser \
  --case er.relationship-spacing-01 \
  --out-dir artifacts/harness/manual-capture
```

### Self-Review

Spec coverage check:
- command shape is covered in Task 3
- URL stability is covered in Task 1
- browser automation boundary is covered in Task 2
- wait strategy is covered in Task 4
- docs update is covered in Task 4

Placeholder scan:
- no `TBD`, `TODO`, or “similar to” placeholders remain

Type consistency:
- `runHarnessCaptureBrowser`
- `buildBrowserPreviewUrl`
- `capturePreviewArtifacts`
- `CaptureViewport`

These names are introduced once and reused consistently across tasks.
