import fs from 'fs'
import path from 'path'
import { execFileSync } from 'child_process'
import type { TraceEnvironment } from './trace-contracts'

export type CaptureTraceEnvironmentOptions = {
  cwd: string
  now?: Date
  pnpmVersion?: string
  packageManager?: string
}

function readPackageManager(cwd: string) {
  try {
    const packageJson = JSON.parse(fs.readFileSync(path.join(cwd, 'package.json'), 'utf8')) as {
      packageManager?: unknown
    }
    return typeof packageJson.packageManager === 'string' ? packageJson.packageManager : null
  } catch {
    return null
  }
}

function readPnpmVersion() {
  try {
    return execFileSync('pnpm', ['--version'], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim()
  } catch {
    return 'unknown'
  }
}

export function captureTraceEnvironment(options: CaptureTraceEnvironmentOptions): TraceEnvironment {
  const now = options.now ?? new Date()

  return {
    schema_version: 1,
    node: process.version,
    pnpm: options.pnpmVersion ?? readPnpmVersion(),
    platform: process.platform,
    arch: process.arch,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'unknown',
    cwd: options.cwd,
    package_manager: options.packageManager ?? readPackageManager(options.cwd),
    captured_at: now.toISOString(),
  }
}
