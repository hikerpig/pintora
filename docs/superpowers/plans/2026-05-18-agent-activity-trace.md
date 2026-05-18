# Agent Activity Trace Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add the first usable Agent Activity Trace slice: activity contracts, trace initialization, append-only event recording, and per-run activity summaries.

**Architecture:** Keep the implementation inside `packages/pintora-harness`, matching the existing trace and analysis module boundaries. Add a new `src/activity/` module group for event contracts, reading/writing, and summary generation, then expose commands through the existing CLI. `trace-run` initializes activity files, while activity commands append or summarize process evidence without mutating source code.

**Tech Stack:** TypeScript, Node `fs`/`path`, yargs CLI, Jest, pnpm, existing Pintora harness trace readers.

---

## File Structure

- Create `packages/pintora-harness/src/activity/activity-contracts.ts`
  - Owns event kinds, phases, constraint statuses, TypeScript types, and validation helpers.
- Create `packages/pintora-harness/src/activity/activity-writer.ts`
  - Owns activity file initialization and append-only event writing.
- Create `packages/pintora-harness/src/activity/activity-reader.ts`
  - Owns safe reading of `agent-events.ndjson` and `constraints.json`.
- Create `packages/pintora-harness/src/activity/summarize-agent-run.ts`
  - Owns `agent-summary.md` and `constraint-gaps.md` generation for one trace run.
- Modify `packages/pintora-harness/src/trace/trace-run.ts`
  - Calls activity initialization when creating a trace directory.
- Modify `packages/pintora-harness/src/cli.ts`
  - Adds `trace-agent-event` and `summarize-agent-run`.
- Modify `packages/pintora-harness/src/index.ts`
  - Exports new public types and functions.
- Add tests:
  - `packages/pintora-harness/src/__tests__/activity-contracts.spec.ts`
  - `packages/pintora-harness/src/__tests__/activity-writer.spec.ts`
  - `packages/pintora-harness/src/__tests__/summarize-agent-run.spec.ts`
  - Extend `packages/pintora-harness/src/__tests__/trace-run.spec.ts`
  - Extend `packages/pintora-harness/src/__tests__/cli.spec.ts`
- Modify docs:
  - `packages/pintora-harness/README.md`
  - `docs/agent-observability-harness-usage.md`

## Task 1: Activity Contracts

**Files:**

- Create: `packages/pintora-harness/src/activity/activity-contracts.ts`
- Test: `packages/pintora-harness/src/__tests__/activity-contracts.spec.ts`
- Modify: `packages/pintora-harness/src/index.ts`

- [ ] **Step 1: Write failing contract tests**

Create `packages/pintora-harness/src/__tests__/activity-contracts.spec.ts`:

```ts
import {
  assertActivityEventKind,
  assertActivityEventPhase,
  assertConstraintStatus,
  parseActivityEventData,
} from '../activity/activity-contracts'

describe('activity contracts', () => {
  it('accepts supported event kinds, phases, and constraint statuses', () => {
    expect(assertActivityEventKind('constraint_check')).toBe('constraint_check')
    expect(assertActivityEventKind('agent_plan')).toBe('agent_plan')
    expect(assertActivityEventPhase('context')).toBe('context')
    expect(assertActivityEventPhase('verification')).toBe('verification')
    expect(assertConstraintStatus('observed')).toBe('observed')
    expect(assertConstraintStatus('conflicted')).toBe('conflicted')
  })

  it('rejects unsupported event kinds, phases, and constraint statuses', () => {
    expect(() => assertActivityEventKind('raw_transcript')).toThrow('Invalid activity event kind')
    expect(() => assertActivityEventPhase('debugging')).toThrow('Invalid activity event phase')
    expect(() => assertConstraintStatus('passed')).toThrow('Invalid constraint status')
  })

  it('parses JSON object event data', () => {
    expect(parseActivityEventData('{"constraint_id":"pnpm-only","status":"observed"}')).toEqual({
      constraint_id: 'pnpm-only',
      status: 'observed',
    })
  })

  it('rejects malformed or non-object event data', () => {
    expect(() => parseActivityEventData('{')).toThrow('Invalid activity event data JSON')
    expect(() => parseActivityEventData('"text"')).toThrow('Activity event data must be a JSON object')
    expect(() => parseActivityEventData('[]')).toThrow('Activity event data must be a JSON object')
  })
})
```

- [ ] **Step 2: Run the failing tests**

Run:

```bash
pnpm --filter @pintora/harness test -- --runInBand activity-contracts
```

Expected: fail because `../activity/activity-contracts` does not exist.

- [ ] **Step 3: Implement the contracts**

Create `packages/pintora-harness/src/activity/activity-contracts.ts`:

```ts
export const ACTIVITY_EVENT_KINDS = [
  'context_read',
  'agent_plan',
  'constraint_check',
  'edit_intent',
  'edit_result',
  'verification',
  'course_correction',
  'open_question',
  'final_summary',
] as const

export const ACTIVITY_EVENT_PHASES = [
  'context',
  'planning',
  'implementation',
  'verification',
  'review',
  'handoff',
] as const

export const CONSTRAINT_STATUSES = ['observed', 'missed', 'conflicted', 'not_applicable', 'unknown'] as const

export type ActivityEventKind = (typeof ACTIVITY_EVENT_KINDS)[number]
export type ActivityEventPhase = (typeof ACTIVITY_EVENT_PHASES)[number]
export type ConstraintStatus = (typeof CONSTRAINT_STATUSES)[number]

export type ActivityEventData = Record<string, unknown>

export type AgentActivityEvent = {
  schema_version: 1
  ts: string
  kind: ActivityEventKind
  phase: ActivityEventPhase
  summary: string
  data: ActivityEventData
}

export type AgentConstraint = {
  id: string
  source: string
  source_ref?: string
  text: string
  scope: string[]
  severity: 'must' | 'should' | 'may'
  notes?: string
}

export type AgentConstraintsFile = {
  schema_version: 1
  constraints: AgentConstraint[]
}

export function assertActivityEventKind(value: string): ActivityEventKind {
  if ((ACTIVITY_EVENT_KINDS as readonly string[]).includes(value)) return value as ActivityEventKind
  throw new Error(`Invalid activity event kind: ${value}`)
}

export function assertActivityEventPhase(value: string): ActivityEventPhase {
  if ((ACTIVITY_EVENT_PHASES as readonly string[]).includes(value)) return value as ActivityEventPhase
  throw new Error(`Invalid activity event phase: ${value}`)
}

export function assertConstraintStatus(value: string): ConstraintStatus {
  if ((CONSTRAINT_STATUSES as readonly string[]).includes(value)) return value as ConstraintStatus
  throw new Error(`Invalid constraint status: ${value}`)
}

export function parseActivityEventData(input: string): ActivityEventData {
  let parsed: unknown
  try {
    parsed = JSON.parse(input)
  } catch (error) {
    throw new Error(`Invalid activity event data JSON: ${error instanceof Error ? error.message : String(error)}`)
  }

  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('Activity event data must be a JSON object')
  }

  return parsed as ActivityEventData
}
```

- [ ] **Step 4: Export the contracts**

Modify `packages/pintora-harness/src/index.ts`:

```ts
export type {
  ActivityEventData,
  ActivityEventKind,
  ActivityEventPhase,
  AgentActivityEvent,
  AgentConstraint,
  AgentConstraintsFile,
  ConstraintStatus,
} from './activity/activity-contracts'
export {
  ACTIVITY_EVENT_KINDS,
  ACTIVITY_EVENT_PHASES,
  CONSTRAINT_STATUSES,
  assertActivityEventKind,
  assertActivityEventPhase,
  assertConstraintStatus,
  parseActivityEventData,
} from './activity/activity-contracts'
```

- [ ] **Step 5: Run contract tests**

Run:

```bash
pnpm --filter @pintora/harness test -- --runInBand activity-contracts
```

Expected: pass.

## Task 2: Initialize Activity Files from `trace-run`

**Files:**

- Create: `packages/pintora-harness/src/activity/activity-writer.ts`
- Test: `packages/pintora-harness/src/__tests__/activity-writer.spec.ts`
- Modify: `packages/pintora-harness/src/trace/trace-run.ts`
- Modify: `packages/pintora-harness/src/__tests__/trace-run.spec.ts`
- Modify: `packages/pintora-harness/src/index.ts`

- [ ] **Step 1: Write writer initialization tests**

Create `packages/pintora-harness/src/__tests__/activity-writer.spec.ts`:

```ts
import * as fs from 'node:fs'
import * as os from 'node:os'
import * as path from 'node:path'
import { initializeAgentActivityFiles } from '../activity/activity-writer'

describe('activity writer initialization', () => {
  it('creates empty activity event and summary files plus an empty constraints file', () => {
    const runDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pintora-activity-'))

    initializeAgentActivityFiles(runDir)

    expect(fs.readFileSync(path.join(runDir, 'agent-events.ndjson'), 'utf8')).toBe('')
    expect(JSON.parse(fs.readFileSync(path.join(runDir, 'constraints.json'), 'utf8'))).toEqual({
      schema_version: 1,
      constraints: [],
    })
    expect(fs.readFileSync(path.join(runDir, 'agent-summary.md'), 'utf8')).toContain('# Agent Summary')
    expect(fs.readFileSync(path.join(runDir, 'constraint-gaps.md'), 'utf8')).toContain('# Constraint Gaps')
  })

  it('does not overwrite existing activity files', () => {
    const runDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pintora-activity-'))
    fs.writeFileSync(path.join(runDir, 'agent-events.ndjson'), '{"kind":"context_read"}\n')
    fs.writeFileSync(path.join(runDir, 'constraints.json'), '{"schema_version":1,"constraints":[{"id":"x"}]}\n')

    initializeAgentActivityFiles(runDir)

    expect(fs.readFileSync(path.join(runDir, 'agent-events.ndjson'), 'utf8')).toBe('{"kind":"context_read"}\n')
    expect(fs.readFileSync(path.join(runDir, 'constraints.json'), 'utf8')).toContain('"id":"x"')
  })
})
```

- [ ] **Step 2: Run the failing writer tests**

Run:

```bash
pnpm --filter @pintora/harness test -- --runInBand activity-writer
```

Expected: fail because `activity-writer` does not exist.

- [ ] **Step 3: Implement activity initialization**

Create `packages/pintora-harness/src/activity/activity-writer.ts`:

```ts
import * as fs from 'node:fs'
import * as path from 'node:path'
import type { AgentActivityEvent, AgentConstraintsFile } from './activity-contracts'

export const AGENT_EVENTS_FILE = 'agent-events.ndjson'
export const CONSTRAINTS_FILE = 'constraints.json'
export const AGENT_SUMMARY_FILE = 'agent-summary.md'
export const CONSTRAINT_GAPS_FILE = 'constraint-gaps.md'

export function initializeAgentActivityFiles(runDir: string) {
  fs.mkdirSync(runDir, { recursive: true })
  writeFileIfMissing(path.join(runDir, AGENT_EVENTS_FILE), '')
  writeFileIfMissing(
    path.join(runDir, CONSTRAINTS_FILE),
    `${JSON.stringify({ schema_version: 1, constraints: [] } satisfies AgentConstraintsFile, null, 2)}\n`,
  )
  writeFileIfMissing(path.join(runDir, AGENT_SUMMARY_FILE), '# Agent Summary\n\nNo activity events recorded yet.\n')
  writeFileIfMissing(path.join(runDir, CONSTRAINT_GAPS_FILE), '# Constraint Gaps\n\nNo constraint gaps recorded yet.\n')
}

export function appendAgentActivityEvent(runDir: string, event: AgentActivityEvent) {
  fs.mkdirSync(runDir, { recursive: true })
  fs.appendFileSync(path.join(runDir, AGENT_EVENTS_FILE), `${JSON.stringify(event)}\n`)
}

function writeFileIfMissing(filePath: string, content: string) {
  if (!fs.existsSync(filePath)) fs.writeFileSync(filePath, content)
}
```

- [ ] **Step 4: Call initialization from trace-run**

Modify `packages/pintora-harness/src/trace/trace-run.ts`:

```ts
import { initializeAgentActivityFiles } from '../activity/activity-writer'
```

Then after `fs.mkdirSync(runDir, { recursive: true })`, add:

```ts
initializeAgentActivityFiles(runDir)
```

- [ ] **Step 5: Extend trace-run tests**

In `packages/pintora-harness/src/__tests__/trace-run.spec.ts`, inside the successful trace test after existing file existence checks, add:

```ts
expect(fs.existsSync(path.join(runDir, 'agent-events.ndjson'))).toBe(true)
expect(fs.existsSync(path.join(runDir, 'constraints.json'))).toBe(true)
expect(fs.existsSync(path.join(runDir, 'agent-summary.md'))).toBe(true)
expect(fs.existsSync(path.join(runDir, 'constraint-gaps.md'))).toBe(true)
expect(JSON.parse(fs.readFileSync(path.join(runDir, 'constraints.json'), 'utf8'))).toEqual({
  schema_version: 1,
  constraints: [],
})
```

In the compile failure test, add:

```ts
expect(fs.existsSync(path.join(runDir, 'agent-events.ndjson'))).toBe(true)
expect(fs.existsSync(path.join(runDir, 'constraints.json'))).toBe(true)
```

- [ ] **Step 6: Export writer helpers**

Modify `packages/pintora-harness/src/index.ts`:

```ts
export {
  AGENT_EVENTS_FILE,
  AGENT_SUMMARY_FILE,
  CONSTRAINTS_FILE,
  CONSTRAINT_GAPS_FILE,
  appendAgentActivityEvent,
  initializeAgentActivityFiles,
} from './activity/activity-writer'
```

- [ ] **Step 7: Run initialization tests**

Run:

```bash
pnpm --filter @pintora/harness test -- --runInBand activity-writer trace-run
```

Expected: pass.

## Task 3: Add `trace-agent-event`

**Files:**

- Modify: `packages/pintora-harness/src/activity/activity-writer.ts`
- Modify: `packages/pintora-harness/src/cli.ts`
- Modify: `packages/pintora-harness/src/__tests__/activity-writer.spec.ts`
- Modify: `packages/pintora-harness/src/__tests__/cli.spec.ts`

- [ ] **Step 1: Add event append tests**

Append these tests to `packages/pintora-harness/src/__tests__/activity-writer.spec.ts`:

```ts
import { buildAgentActivityEvent, runHarnessTraceAgentEvent } from '../activity/activity-writer'

describe('activity event append', () => {
  it('builds and appends one event with timestamp and schema version', async () => {
    const runDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pintora-activity-'))

    const result = await runHarnessTraceAgentEvent({
      runDir,
      kind: 'constraint_check',
      phase: 'context',
      summary: 'Read package AGENTS.md before editing harness package.',
      data: {
        constraint_id: 'package-agents-before-edit',
        status: 'observed',
      },
    })

    expect(result).toEqual({
      status: 'completed',
      event: 'agent-events.ndjson',
    })

    const events = fs
      .readFileSync(path.join(runDir, 'agent-events.ndjson'), 'utf8')
      .trim()
      .split('\n')
      .map(line => JSON.parse(line))

    expect(events).toHaveLength(1)
    expect(events[0]).toMatchObject({
      schema_version: 1,
      kind: 'constraint_check',
      phase: 'context',
      summary: 'Read package AGENTS.md before editing harness package.',
      data: {
        constraint_id: 'package-agents-before-edit',
        status: 'observed',
      },
    })
    expect(typeof events[0].ts).toBe('string')
  })

  it('rejects an empty summary before writing', () => {
    expect(() =>
      buildAgentActivityEvent({
        kind: 'agent_plan',
        phase: 'planning',
        summary: ' ',
        data: {},
      }),
    ).toThrow('Activity event summary is required')
  })
})
```

- [ ] **Step 2: Run failing append tests**

Run:

```bash
pnpm --filter @pintora/harness test -- --runInBand activity-writer
```

Expected: fail because `buildAgentActivityEvent` and `runHarnessTraceAgentEvent` are missing.

- [ ] **Step 3: Implement event builder and runner**

Add to `packages/pintora-harness/src/activity/activity-writer.ts`:

```ts
import {
  assertActivityEventKind,
  assertActivityEventPhase,
  assertConstraintStatus,
  type ActivityEventData,
  type ActivityEventKind,
  type ActivityEventPhase,
} from './activity-contracts'
```

Then add:

```ts
export type RunHarnessTraceAgentEventOptions = {
  runDir: string
  kind: string
  phase: string
  summary: string
  data: ActivityEventData
}

export function buildAgentActivityEvent(opts: Omit<RunHarnessTraceAgentEventOptions, 'runDir'>): AgentActivityEvent {
  const kind = assertActivityEventKind(opts.kind)
  const phase = assertActivityEventPhase(opts.phase)
  const summary = opts.summary.trim()
  if (!summary) throw new Error('Activity event summary is required')

  if (kind === 'constraint_check') {
    const status = opts.data.status
    if (typeof status === 'string') assertConstraintStatus(status)
  }

  return {
    schema_version: 1,
    ts: new Date().toISOString(),
    kind,
    phase,
    summary,
    data: opts.data,
  }
}

export async function runHarnessTraceAgentEvent(opts: RunHarnessTraceAgentEventOptions) {
  const event = buildAgentActivityEvent(opts)
  initializeAgentActivityFiles(opts.runDir)
  appendAgentActivityEvent(opts.runDir, event)

  return {
    status: 'completed' as const,
    event: AGENT_EVENTS_FILE,
  }
}
```

- [ ] **Step 4: Add CLI command**

Modify `packages/pintora-harness/src/cli.ts`.

Add args type:

```ts
type TraceAgentEventArgs = {
  run: string
  kind: string
  phase: string
  summary: string
  data: string
}
```

Add command before `summarize-agent-run`:

```ts
.command<TraceAgentEventArgs>({
  command: 'trace-agent-event',
  describe: 'Append one agent activity event to a trace run',
  builder: {
    run: { describe: 'Trace run directory', type: 'string', demandOption: true },
    kind: { describe: 'Activity event kind', type: 'string', demandOption: true },
    phase: { describe: 'Activity event phase', type: 'string', demandOption: true },
    summary: { describe: 'Bounded event summary', type: 'string', demandOption: true },
    data: { describe: 'JSON object event data', type: 'string', default: '{}' },
  },
  handler: handleTraceAgentEventCommand,
})
```

Add handler:

```ts
async function handleTraceAgentEventCommand(args: TraceAgentEventArgs) {
  try {
    const { parseActivityEventData } =
      require('./activity/activity-contracts') as typeof import('./activity/activity-contracts')
    const { runHarnessTraceAgentEvent } =
      require('./activity/activity-writer') as typeof import('./activity/activity-writer')
    const result = await runHarnessTraceAgentEvent({
      runDir: args.run,
      kind: args.kind,
      phase: args.phase,
      summary: args.summary,
      data: parseActivityEventData(args.data),
    })
    process.stdout.write(`${JSON.stringify(result)}\n`)
    process.exitCode = 0
  } catch (error) {
    consola.error(error)
    process.exitCode = 1
  }
}
```

- [ ] **Step 5: Add CLI dispatch test**

Append to `packages/pintora-harness/src/__tests__/cli.spec.ts`:

```ts
it('dispatches trace-agent-event to the activity event runner', async () => {
  const mockRunHarnessTraceAgentEvent = jest.fn(async () => ({
    status: 'completed',
    event: 'agent-events.ndjson',
  }))

  process.argv = [
    'node',
    'pintora-harness',
    'trace-agent-event',
    '--run',
    '/tmp/agent-runs/run-one',
    '--kind',
    'constraint_check',
    '--phase',
    'context',
    '--summary',
    'Read package AGENTS.md before editing harness package.',
    '--data',
    '{"constraint_id":"package-agents-before-edit","status":"observed"}',
  ]

  jest.mock('../activity/activity-writer', () => ({
    runHarnessTraceAgentEvent: mockRunHarnessTraceAgentEvent,
  }))

  jest.isolateModules(() => {
    require('../cli')
  })

  await new Promise(resolve => setImmediate(resolve))

  expect(mockRunHarnessTraceAgentEvent).toHaveBeenCalledWith({
    runDir: '/tmp/agent-runs/run-one',
    kind: 'constraint_check',
    phase: 'context',
    summary: 'Read package AGENTS.md before editing harness package.',
    data: {
      constraint_id: 'package-agents-before-edit',
      status: 'observed',
    },
  })
  expect(process.exitCode).toBe(0)
})
```

- [ ] **Step 6: Run event command tests**

Run:

```bash
pnpm --filter @pintora/harness test -- --runInBand activity-writer cli
```

Expected: pass.

## Task 4: Add Activity Reader and `summarize-agent-run`

**Files:**

- Create: `packages/pintora-harness/src/activity/activity-reader.ts`
- Create: `packages/pintora-harness/src/activity/summarize-agent-run.ts`
- Test: `packages/pintora-harness/src/__tests__/summarize-agent-run.spec.ts`
- Modify: `packages/pintora-harness/src/cli.ts`
- Modify: `packages/pintora-harness/src/__tests__/cli.spec.ts`
- Modify: `packages/pintora-harness/src/index.ts`

- [ ] **Step 1: Write summary tests**

Create `packages/pintora-harness/src/__tests__/summarize-agent-run.spec.ts`:

```ts
import * as fs from 'node:fs'
import * as os from 'node:os'
import * as path from 'node:path'
import { runHarnessSummarizeAgentRun } from '../activity/summarize-agent-run'

function writeJson(file: string, value: unknown) {
  fs.mkdirSync(path.dirname(file), { recursive: true })
  fs.writeFileSync(file, JSON.stringify(value, null, 2))
}

describe('runHarnessSummarizeAgentRun', () => {
  it('writes agent summary and constraint gap reports from activity events', async () => {
    const runDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pintora-agent-summary-'))
    writeJson(path.join(runDir, 'manifest.json'), {
      schema_version: 1,
      run_id: 'run-one',
      task: { title: 'Add agent activity trace' },
      outcome: {
        compile: 'pass',
        unit_tests: 'pass',
        harness: 'ok',
        review: 'not_run',
      },
    })
    writeJson(path.join(runDir, 'constraints.json'), {
      schema_version: 1,
      constraints: [
        {
          id: 'package-agents-before-edit',
          source: 'AGENTS.md',
          text: 'Before editing inside a package, read its AGENTS.md.',
          scope: ['packages/*'],
          severity: 'must',
        },
      ],
    })
    fs.writeFileSync(
      path.join(runDir, 'agent-events.ndjson'),
      [
        JSON.stringify({
          schema_version: 1,
          ts: '2026-05-18T10:00:00.000Z',
          kind: 'context_read',
          phase: 'context',
          summary: 'Read packages/pintora-harness/AGENTS.md.',
          data: { evidence_refs: ['packages/pintora-harness/AGENTS.md'] },
        }),
        JSON.stringify({
          schema_version: 1,
          ts: '2026-05-18T10:01:00.000Z',
          kind: 'constraint_check',
          phase: 'context',
          summary: 'Package AGENTS.md was read before edits.',
          data: {
            constraint_id: 'package-agents-before-edit',
            status: 'observed',
            evidence: 'Read package instructions first.',
          },
        }),
        JSON.stringify({
          schema_version: 1,
          ts: '2026-05-18T10:02:00.000Z',
          kind: 'constraint_check',
          phase: 'verification',
          summary: 'No rule tells agents when to run compare-runs.',
          data: {
            constraint_id: 'compare-runs-workflow',
            status: 'missed',
            evidence: 'The workflow had to be inferred from the design document.',
          },
        }),
        JSON.stringify({
          schema_version: 1,
          ts: '2026-05-18T10:03:00.000Z',
          kind: 'course_correction',
          phase: 'verification',
          summary: 'Fixed TypeScript errors after compile failed.',
          data: { trigger: 'compile failure', next_action: 'fix typing before harness' },
        }),
      ].join('\n') + '\n',
    )

    const result = await runHarnessSummarizeAgentRun({ runDir })

    expect(result).toEqual({
      status: 'completed',
      summary: 'agent-summary.md',
      gaps: 'constraint-gaps.md',
    })
    const summary = fs.readFileSync(path.join(runDir, 'agent-summary.md'), 'utf8')
    expect(summary).toContain('# Agent Summary: run-one')
    expect(summary).toContain('Task: Add agent activity trace')
    expect(summary).toContain('context_read: Read packages/pintora-harness/AGENTS.md.')
    expect(summary).toContain('package-agents-before-edit: observed')
    expect(summary).toContain('Fixed TypeScript errors after compile failed.')

    const gaps = fs.readFileSync(path.join(runDir, 'constraint-gaps.md'), 'utf8')
    expect(gaps).toContain('# Constraint Gaps: run-one')
    expect(gaps).toContain('compare-runs-workflow')
    expect(gaps).toContain('No rule tells agents when to run compare-runs.')
  })
})
```

- [ ] **Step 2: Run failing summary tests**

Run:

```bash
pnpm --filter @pintora/harness test -- --runInBand summarize-agent-run
```

Expected: fail because summary modules do not exist.

- [ ] **Step 3: Implement activity reader**

Create `packages/pintora-harness/src/activity/activity-reader.ts`:

```ts
import * as fs from 'node:fs'
import * as path from 'node:path'
import type { AgentActivityEvent, AgentConstraintsFile } from './activity-contracts'
import { AGENT_EVENTS_FILE, CONSTRAINTS_FILE } from './activity-writer'

export function readAgentActivityEvents(runDir: string): AgentActivityEvent[] {
  const filePath = path.join(runDir, AGENT_EVENTS_FILE)
  if (!fs.existsSync(filePath)) return []
  return fs
    .readFileSync(filePath, 'utf8')
    .split('\n')
    .map(line => line.trim())
    .filter(Boolean)
    .flatMap(line => {
      try {
        return [JSON.parse(line) as AgentActivityEvent]
      } catch {
        return []
      }
    })
}

export function readAgentConstraints(runDir: string): AgentConstraintsFile {
  const filePath = path.join(runDir, CONSTRAINTS_FILE)
  if (!fs.existsSync(filePath)) return { schema_version: 1, constraints: [] }
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8')) as AgentConstraintsFile
  } catch {
    return { schema_version: 1, constraints: [] }
  }
}
```

- [ ] **Step 4: Implement summary generation**

Create `packages/pintora-harness/src/activity/summarize-agent-run.ts`:

```ts
import * as fs from 'node:fs'
import * as path from 'node:path'
import { readAgentActivityEvents, readAgentConstraints } from './activity-reader'
import { AGENT_SUMMARY_FILE, CONSTRAINT_GAPS_FILE, initializeAgentActivityFiles } from './activity-writer'

type MinimalManifest = {
  run_id?: string
  task?: { title?: string }
  outcome?: Record<string, string>
}

export async function runHarnessSummarizeAgentRun(opts: { runDir: string }) {
  initializeAgentActivityFiles(opts.runDir)
  const manifest = readJson<MinimalManifest>(path.join(opts.runDir, 'manifest.json')) || {}
  const events = readAgentActivityEvents(opts.runDir)
  const constraints = readAgentConstraints(opts.runDir)
  const runId = manifest.run_id || path.basename(opts.runDir)

  fs.writeFileSync(path.join(opts.runDir, AGENT_SUMMARY_FILE), buildAgentSummary(runId, manifest, events))
  fs.writeFileSync(path.join(opts.runDir, CONSTRAINT_GAPS_FILE), buildConstraintGaps(runId, events, constraints))

  return {
    status: 'completed' as const,
    summary: AGENT_SUMMARY_FILE,
    gaps: CONSTRAINT_GAPS_FILE,
  }
}

function buildAgentSummary(
  runId: string,
  manifest: MinimalManifest,
  events: ReturnType<typeof readAgentActivityEvents>,
) {
  const constraintChecks = events.filter(event => event.kind === 'constraint_check')
  const courseCorrections = events.filter(event => event.kind === 'course_correction')
  const lines = [
    `# Agent Summary: ${runId}`,
    '',
    `Task: ${manifest.task?.title || 'unknown task'}`,
    '',
    '## Outcomes',
    '',
    ...Object.entries(manifest.outcome || {}).map(([key, value]) => `- ${key}: ${value}`),
    '',
    '## Events',
    '',
    ...events.map(event => `- ${event.phase}/${event.kind}: ${event.summary}`),
    '',
    '## Constraint Checks',
    '',
  ]

  if (constraintChecks.length === 0) {
    lines.push('- None recorded')
  } else {
    for (const event of constraintChecks) {
      lines.push(`- ${String(event.data.constraint_id || 'unknown')}: ${String(event.data.status || 'unknown')}`)
    }
  }

  lines.push('', '## Course Corrections', '')
  if (courseCorrections.length === 0) {
    lines.push('- None recorded')
  } else {
    lines.push(...courseCorrections.map(event => `- ${event.summary}`))
  }

  return `${lines.join('\n')}\n`
}

function buildConstraintGaps(
  runId: string,
  events: ReturnType<typeof readAgentActivityEvents>,
  constraints: ReturnType<typeof readAgentConstraints>,
) {
  const gapEvents = events.filter(
    event =>
      event.kind === 'constraint_check' && (event.data.status === 'missed' || event.data.status === 'conflicted'),
  )
  const knownConstraints = new Map(constraints.constraints.map(item => [item.id, item]))
  const lines = [`# Constraint Gaps: ${runId}`, '']

  if (gapEvents.length === 0) {
    lines.push('- None recorded')
  } else {
    for (const event of gapEvents) {
      const constraintId = String(event.data.constraint_id || 'unknown')
      const constraint = knownConstraints.get(constraintId)
      lines.push(
        `## ${constraintId}`,
        '',
        `- status: ${String(event.data.status || 'unknown')}`,
        `- summary: ${event.summary}`,
        `- source: ${constraint?.source || 'unknown'}`,
        `- evidence: ${String(event.data.evidence || 'not recorded')}`,
        '',
      )
    }
  }

  return `${lines.join('\n')}\n`
}

function readJson<T>(filePath: string): T | null {
  if (!fs.existsSync(filePath)) return null
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8')) as T
  } catch {
    return null
  }
}
```

- [ ] **Step 5: Add CLI command**

Modify `packages/pintora-harness/src/cli.ts`.

Add args type:

```ts
type SummarizeAgentRunArgs = {
  run: string
}
```

Add command:

```ts
.command<SummarizeAgentRunArgs>({
  command: 'summarize-agent-run',
  describe: 'Write activity summary and constraint gap reports for one trace run',
  builder: {
    run: { describe: 'Trace run directory', type: 'string', demandOption: true },
  },
  handler: handleSummarizeAgentRunCommand,
})
```

Add handler:

```ts
async function handleSummarizeAgentRunCommand(args: SummarizeAgentRunArgs) {
  try {
    const { runHarnessSummarizeAgentRun } =
      require('./activity/summarize-agent-run') as typeof import('./activity/summarize-agent-run')
    const result = await runHarnessSummarizeAgentRun({
      runDir: args.run,
    })
    process.stdout.write(`${JSON.stringify(result)}\n`)
    process.exitCode = 0
  } catch (error) {
    consola.error(error)
    process.exitCode = 1
  }
}
```

- [ ] **Step 6: Add CLI dispatch test**

Append to `packages/pintora-harness/src/__tests__/cli.spec.ts`:

```ts
it('dispatches summarize-agent-run to the activity summary runner', async () => {
  const mockRunHarnessSummarizeAgentRun = jest.fn(async () => ({
    status: 'completed',
    summary: 'agent-summary.md',
    gaps: 'constraint-gaps.md',
  }))

  process.argv = ['node', 'pintora-harness', 'summarize-agent-run', '--run', '/tmp/agent-runs/run-one']

  jest.mock('../activity/summarize-agent-run', () => ({
    runHarnessSummarizeAgentRun: mockRunHarnessSummarizeAgentRun,
  }))

  jest.isolateModules(() => {
    require('../cli')
  })

  await new Promise(resolve => setImmediate(resolve))

  expect(mockRunHarnessSummarizeAgentRun).toHaveBeenCalledWith({
    runDir: '/tmp/agent-runs/run-one',
  })
  expect(process.exitCode).toBe(0)
})
```

- [ ] **Step 7: Export reader and summary helpers**

Modify `packages/pintora-harness/src/index.ts`:

```ts
export { readAgentActivityEvents, readAgentConstraints } from './activity/activity-reader'
export { runHarnessSummarizeAgentRun } from './activity/summarize-agent-run'
```

- [ ] **Step 8: Run summary tests**

Run:

```bash
pnpm --filter @pintora/harness test -- --runInBand summarize-agent-run cli
```

Expected: pass.

## Task 5: Documentation and Manual Smoke

**Files:**

- Modify: `packages/pintora-harness/README.md`
- Modify: `docs/agent-observability-harness-usage.md`

- [ ] **Step 1: Update README commands**

In `packages/pintora-harness/README.md`, add these command examples under orchestration:

```md
- `pintora-harness trace-agent-event --run artifacts/agent-runs/<run-id> --kind constraint_check --phase context --summary "Read package AGENTS.md" --data '{"constraint_id":"package-agents-before-edit","status":"observed"}'`
- `pintora-harness summarize-agent-run --run artifacts/agent-runs/<run-id>`
```

Add an artifact section:

```md
### Agent Activity

- `agent-events.ndjson`
- `constraints.json`
- `agent-summary.md`
- `constraint-gaps.md`

`trace-run` initializes these files. `trace-agent-event` appends bounded process evidence, and `summarize-agent-run` turns those events into a human-readable activity summary and constraint gap report.
```

- [ ] **Step 2: Update usage guide**

In `docs/agent-observability-harness-usage.md`, add a section after Decision Observability:

Use this Markdown content:

````md
## Agent Activity Trace

Use activity events when you want to understand how an agent followed project constraints during a development task.

```bash
node packages/pintora-harness/bin/pintora-harness trace-agent-event \
  --run artifacts/agent-runs/<run-id> \
  --kind constraint_check \
  --phase context \
  --summary "Read package AGENTS.md before editing harness package." \
  --data '{"constraint_id":"package-agents-before-edit","status":"observed"}'
```

Then summarize:

```bash
node packages/pintora-harness/bin/pintora-harness summarize-agent-run \
  --run artifacts/agent-runs/<run-id>
```

The activity trace is bounded process evidence, not a raw transcript.
````

- [ ] **Step 3: Format changed files**

Run:

```bash
pnpm exec prettier --write packages/pintora-harness/README.md docs/agent-observability-harness-usage.md packages/pintora-harness/src/**/*.ts
```

Expected: prettier completes without errors.

- [ ] **Step 4: Run focused tests**

Run:

```bash
pnpm --filter @pintora/harness test -- --runInBand activity-contracts activity-writer summarize-agent-run cli trace-run
```

Expected: all selected suites pass.

- [ ] **Step 5: Run compile and full harness tests**

Run:

```bash
pnpm --filter @pintora/harness compile
pnpm --filter @pintora/harness test -- --runInBand
```

Expected: TypeScript compile passes and the full harness test suite passes.

- [ ] **Step 6: Run manual activity smoke**

Run:

```bash
node packages/pintora-harness/bin/pintora-harness trace-run \
  --task "manual activity trace smoke" \
  --suite smoke \
  --out artifacts/agent-runs \
  --run-id 20260518-activity-smoke \
  --no-compile \
  --no-tests \
  --no-capture-browser \
  --max-concurrency 1

node packages/pintora-harness/bin/pintora-harness trace-agent-event \
  --run artifacts/agent-runs/20260518-activity-smoke \
  --kind constraint_check \
  --phase context \
  --summary "Read package AGENTS.md before editing harness package." \
  --data '{"constraint_id":"package-agents-before-edit","status":"observed"}'

node packages/pintora-harness/bin/pintora-harness summarize-agent-run \
  --run artifacts/agent-runs/20260518-activity-smoke
```

Expected:

- `agent-events.ndjson` has one event.
- `agent-summary.md` mentions the constraint check.
- `constraint-gaps.md` reports no gaps.

## Self-Review

Spec coverage:

- P1 activity contracts and trace initialization are covered by Tasks 1 and 2.
- P2 `trace-agent-event` is covered by Task 3.
- P3 `summarize-agent-run` is covered by Task 4.
- Documentation and smoke verification are covered by Task 5.

Deferred intentionally:

- `analyze-agent-runs` is P4 in the design and should be implemented after dogfooding the first activity files.
- Constraint discovery helpers are P5 and depend on real examples of manual constraints.
- Transcript import is P6 and remains opt-in future work.

Placeholder scan:

- No placeholder markers are required to execute this plan.
- Each code step includes concrete file paths and code to add.

Type consistency:

- `AgentActivityEvent`, `AgentConstraintsFile`, event kind, phase, and status names match across contracts, writer, reader, CLI, and tests.
