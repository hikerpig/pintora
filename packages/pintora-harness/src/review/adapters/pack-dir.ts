import * as fs from 'node:fs'
import * as path from 'node:path'

export function ensurePackDir(dir: string) {
  fs.mkdirSync(dir, { recursive: true })
}

function resolveExistingParentRealPath(targetDir: string) {
  let current = targetDir
  while (!fs.existsSync(current)) {
    const parent = path.dirname(current)
    if (parent === current) break
    current = parent
  }
  return fs.realpathSync.native(current)
}

export function resolveReviewPackDir(artifactsDir: string, packDir: string) {
  const rootDir = path.resolve(artifactsDir)
  const rootRealDir = fs.realpathSync.native(rootDir)
  const resolvedPackDir = path.isAbsolute(packDir) ? path.resolve(packDir) : path.resolve(rootDir, packDir)
  const existingParentRealPath = resolveExistingParentRealPath(resolvedPackDir)
  const rootPrefix = rootRealDir.endsWith(path.sep) ? rootRealDir : `${rootRealDir}${path.sep}`

  if (existingParentRealPath !== rootRealDir && !existingParentRealPath.startsWith(rootPrefix)) {
    throw new Error(`Review pack directory must be inside artifactsDir: ${packDir}`)
  }

  return {
    resolvedPackDir,
    relativePackDir: path.relative(rootDir, resolvedPackDir) || '.',
  }
}

export function writePackDirPayload(opts: { artifactsDir: string; packDir: string; payload: unknown }) {
  const { resolvedPackDir, relativePackDir } = resolveReviewPackDir(opts.artifactsDir, opts.packDir)
  ensurePackDir(resolvedPackDir)
  fs.writeFileSync(path.join(resolvedPackDir, 'payload.json'), JSON.stringify(opts.payload, null, 2))
  return { resolvedPackDir, relativePackDir }
}
