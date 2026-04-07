import * as fs from 'node:fs'
import * as path from 'node:path'
import { HarnessCase } from '../contracts/harness'

type RegistryFile = {
  cases: HarnessCase[]
}

const workspaceRootCache = new Map<string, string>()
const registryCache = new Map<string, Map<string, HarnessCase>>()

export function resolveHarnessWorkspaceRoot(cwd: string) {
  const key = path.resolve(cwd)
  const cached = workspaceRootCache.get(key)
  if (cached) return cached

  let current = key
  while (true) {
    const candidate = path.join(current, 'harness/cases/registry.json')
    if (fs.existsSync(candidate)) {
      workspaceRootCache.set(key, current)
      return current
    }

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
  const registryPath = getRegistryPath(cwd)
  const cached = registryCache.get(registryPath)
  if (cached) return cached

  const parsed = JSON.parse(fs.readFileSync(registryPath, 'utf8')) as RegistryFile
  const map = new Map(parsed.cases.map(item => [item.id, item] as const))
  registryCache.set(registryPath, map)
  return map
}

export function resolveCaseInput(cwd: string, caseId: string) {
  const item = loadCaseRegistry(cwd).get(caseId)
  if (!item) throw new Error(`Unknown harness case: ${caseId}`)
  return path.join(resolveHarnessWorkspaceRoot(cwd), 'harness/cases', item.input_file)
}
