import * as fs from 'node:fs'
import * as os from 'node:os'
import * as path from 'node:path'
import {
  buildAgentActivityEvent,
  initializeAgentActivityFiles,
  runHarnessTraceAgentEvent,
} from '../activity/activity-writer'

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
