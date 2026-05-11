#!/usr/bin/env node
// AI knowledge base sync utility.
//
// Usage:
//   node scripts/ai-sync.mjs link            # symlink every skill for every supported tool
//   node scripts/ai-sync.mjs link claude     # only Claude Code
//   node scripts/ai-sync.mjs status          # show link status per skill
//   node scripts/ai-sync.mjs unlink          # remove our symlinks
//
// Symlinks are created per-skill so existing third-party skills in the
// tool directories (for example `.claude/skills/openspec-*`) are not
// disturbed. If a target name already exists as a real file or directory
// the script refuses to overwrite it.

import { readdirSync, existsSync, lstatSync, unlinkSync, symlinkSync, mkdirSync } from 'node:fs'
import { resolve, dirname, relative } from 'node:path'

const ROOT = resolve(import.meta.dirname, '..')
const SOURCE_DIR = resolve(ROOT, '.ai/skills')

const TARGETS = {
  claude: '.claude/skills',
}

function listSourceSkills() {
  if (!existsSync(SOURCE_DIR)) return []
  return readdirSync(SOURCE_DIR, { withFileTypes: true })
    .filter(d => d.isDirectory())
    .map(d => d.name)
}

function linkOne(tool, skill) {
  const dest = resolve(ROOT, TARGETS[tool], skill)
  const src = resolve(SOURCE_DIR, skill)
  mkdirSync(dirname(dest), { recursive: true })
  const stat = lstatSync(dest, { throwIfNoEntry: false })
  if (stat) {
    if (!stat.isSymbolicLink()) {
      console.error(`skip ${dest}: not a symlink (real dir or file present)`)
      return
    }
    unlinkSync(dest)
  }
  const target = relative(dirname(dest), src)
  symlinkSync(target, dest, 'dir')
  console.log(`linked ${TARGETS[tool]}/${skill} -> ${target}`)
}

function link(tool) {
  for (const skill of listSourceSkills()) linkOne(tool, skill)
}

function status(tool) {
  const base = resolve(ROOT, TARGETS[tool])
  for (const skill of listSourceSkills()) {
    const dest = resolve(base, skill)
    const stat = lstatSync(dest, { throwIfNoEntry: false })
    const tag = !stat ? 'missing' : stat.isSymbolicLink() ? 'linked' : 'real'
    console.log(`${tool}/${skill}: ${tag}`)
  }
}

function unlink(tool) {
  const base = resolve(ROOT, TARGETS[tool])
  for (const skill of listSourceSkills()) {
    const dest = resolve(base, skill)
    const stat = lstatSync(dest, { throwIfNoEntry: false })
    if (stat?.isSymbolicLink()) {
      unlinkSync(dest)
      console.log(`unlinked ${tool}/${skill}`)
    }
  }
}

const [cmd, tool] = process.argv.slice(2)
const tools = tool ? [tool] : Object.keys(TARGETS)

if (!tool || TARGETS[tool]) {
  if (cmd === 'link') tools.forEach(link)
  else if (cmd === 'status') tools.forEach(status)
  else if (cmd === 'unlink') tools.forEach(unlink)
  else {
    console.error('Usage: ai-sync.mjs link|status|unlink [tool]')
    process.exit(1)
  }
} else {
  console.error(`unknown tool: ${tool}. Supported: ${Object.keys(TARGETS).join(', ')}`)
  process.exit(1)
}
