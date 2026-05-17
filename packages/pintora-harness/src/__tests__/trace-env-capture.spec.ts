import fs from 'fs'
import os from 'os'
import path from 'path'
import { captureTraceEnvironment } from '../trace/env-capture'

describe('captureTraceEnvironment', () => {
  it('captures only allowlisted environment fields', () => {
    const env = captureTraceEnvironment({
      cwd: '/repo',
      now: new Date('2026-05-17T10:52:00.000Z'),
      pnpmVersion: '10.11.0',
      packageManager: 'pnpm@10.11.0',
    })

    expect(env).toEqual({
      schema_version: 1,
      node: process.version,
      pnpm: '10.11.0',
      platform: process.platform,
      arch: process.arch,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'unknown',
      cwd: '/repo',
      package_manager: 'pnpm@10.11.0',
      captured_at: '2026-05-17T10:52:00.000Z',
    })
    expect(Object.keys(env).sort()).toEqual([
      'arch',
      'captured_at',
      'cwd',
      'node',
      'package_manager',
      'platform',
      'pnpm',
      'schema_version',
      'timezone',
    ])
  })

  it('falls back to packageManager from cwd package.json', () => {
    const cwd = fs.mkdtempSync(path.join(os.tmpdir(), 'pintora-trace-env-'))
    fs.writeFileSync(path.join(cwd, 'package.json'), JSON.stringify({ packageManager: 'pnpm@10.12.0' }))

    const env = captureTraceEnvironment({
      cwd,
      now: new Date('2026-05-17T10:52:00.000Z'),
      pnpmVersion: '10.12.0',
    })

    expect(env.package_manager).toBe('pnpm@10.12.0')
  })

  it('uses null when packageManager is missing or unreadable', () => {
    const cwd = fs.mkdtempSync(path.join(os.tmpdir(), 'pintora-trace-env-'))

    const env = captureTraceEnvironment({
      cwd,
      now: new Date('2026-05-17T10:52:00.000Z'),
      pnpmVersion: '10.12.0',
    })

    expect(env.package_manager).toBeNull()
  })
})
