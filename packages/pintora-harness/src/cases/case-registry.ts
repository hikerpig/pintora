import * as fs from 'node:fs'
import * as path from 'node:path'
import { HarnessCase } from '../contracts/harness'

type RegistryFile = {
  cases: HarnessCase[]
}

export function resolveHarnessWorkspaceRoot(cwd: string) {
  let current = path.resolve(cwd)
  while (true) {
    const candidate = path.join(current, 'harness/cases/registry.json')
    if (fs.existsSync(candidate)) return current

    const parent = path.dirname(current)
    if (parent === current) {
      throw new Error(`Unable to locate harness/cases/registry.json from ${cwd}`)
    }
    current = parent
  }
}

export function getRegistryPath(cwd: string) {
  return path.join(resolveHarnessWorkspaceRoot(cwd), 'harness/cases/registry.json')
}

export function loadCaseRegistry(cwd: string) {
  const raw = fs.readFileSync(getRegistryPath(cwd), 'utf8')
  const parsed = JSON.parse(raw) as RegistryFile
  return new Map(parsed.cases.map(item => [item.id, item] as const))
}

export function resolveCaseInput(cwd: string, caseId: string) {
  const item = loadCaseRegistry(cwd).get(caseId)
  if (!item) throw new Error(`Unknown harness case: ${caseId}`)
  return path.join(resolveHarnessWorkspaceRoot(cwd), 'harness/cases', item.input_file)
}
