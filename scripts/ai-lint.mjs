#!/usr/bin/env node
// Validate the AI knowledge base layout.
//
// Checks:
//   1. Every .ai/skills/<name>/SKILL.md has frontmatter with name, description, triggers.
//   2. Every Markdown link inside .ai/ and AGENTS.md files that uses a relative path
//      resolves to an existing file.
//   3. Every code citation of the form `path:line` mentioned inside `.ai/` points to an
//      existing file (line numbers are not verified).
//   4. ADR file numbers under .ai/docs/adr/ are unique.
//
// Exit code is 0 when no problems are found, 1 otherwise. Output is one finding per
// line so it is easy to grep.

import { readdirSync, readFileSync, existsSync, statSync } from 'node:fs'
import { resolve, dirname, relative, join } from 'node:path'

const ROOT = resolve(import.meta.dirname, '..')
const findings = []

function record(file, message) {
  findings.push(`${relative(ROOT, file)}: ${message}`)
}

function walk(dir, accept) {
  if (!existsSync(dir)) return []
  const out = []
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name.startsWith('.git')) continue
    const full = join(dir, entry.name)
    if (entry.isDirectory()) out.push(...walk(full, accept))
    else if (accept(full)) out.push(full)
  }
  return out
}

function parseFrontmatter(content) {
  if (!content.startsWith('---\n')) return null
  const end = content.indexOf('\n---\n', 4)
  if (end === -1) return null
  const fm = {}
  for (const line of content.slice(4, end).split('\n')) {
    const idx = line.indexOf(':')
    if (idx === -1) continue
    fm[line.slice(0, idx).trim()] = line.slice(idx + 1).trim()
  }
  return fm
}

function checkSkillFrontmatter(file) {
  const fm = parseFrontmatter(readFileSync(file, 'utf8'))
  if (!fm) {
    record(file, 'missing frontmatter')
    return
  }
  for (const key of ['name', 'description', 'triggers']) {
    if (!fm[key]) record(file, `frontmatter missing ${key}`)
  }
}

function extractMarkdownLinks(content) {
  const links = []
  const re = /\[[^\]]*\]\(([^)]+)\)/g
  let match
  while ((match = re.exec(content)) !== null) {
    let target = match[1]
    const hashIdx = target.indexOf('#')
    if (hashIdx !== -1) target = target.slice(0, hashIdx)
    links.push(target)
  }
  return links
}

function extractCodeCitations(content) {
  const out = []
  const re = /`([\w./-]+):\d+`/g
  let match
  while ((match = re.exec(content)) !== null) out.push(match[1])
  return out
}

function isRelative(link) {
  return link && !link.startsWith('http://') && !link.startsWith('https://') && !link.startsWith('#') && !link.startsWith('mailto:')
}

function checkLinks(file) {
  const content = readFileSync(file, 'utf8')
  const base = dirname(file)
  for (const link of extractMarkdownLinks(content)) {
    if (!isRelative(link)) continue
    const target = resolve(base, link)
    if (!existsSync(target)) record(file, `broken link: ${link}`)
  }
  for (const cite of extractCodeCitations(content)) {
    const target = resolve(ROOT, cite)
    if (!existsSync(target)) record(file, `broken code citation: ${cite}`)
  }
}

function checkAdrNumbers() {
  const dir = resolve(ROOT, '.ai/docs/adr')
  if (!existsSync(dir)) return
  const numbers = new Map()
  for (const name of readdirSync(dir)) {
    const match = name.match(/^(\d{4})-/)
    if (!match) continue
    const num = match[1]
    if (numbers.has(num)) record(resolve(dir, name), `duplicate ADR number: ${num} (also ${numbers.get(num)})`)
    numbers.set(num, name)
  }
}

// 1. Skill frontmatter
for (const file of walk(resolve(ROOT, '.ai/skills'), p => p.endsWith('/SKILL.md'))) {
  checkSkillFrontmatter(file)
}

// 2. Links inside .ai/
for (const file of walk(resolve(ROOT, '.ai'), p => p.endsWith('.md'))) {
  checkLinks(file)
}

// 3. Links inside root and package AGENTS.md files
const agentsMdFiles = []
const rootAgents = resolve(ROOT, 'AGENTS.md')
if (existsSync(rootAgents)) agentsMdFiles.push(rootAgents)
for (const pkg of readdirSync(resolve(ROOT, 'packages'))) {
  const file = resolve(ROOT, 'packages', pkg, 'AGENTS.md')
  if (existsSync(file) && statSync(file).isFile()) agentsMdFiles.push(file)
}
for (const file of agentsMdFiles) checkLinks(file)

// 4. ADR numbers
checkAdrNumbers()

if (findings.length === 0) {
  console.log('ai-lint: ok')
  process.exit(0)
}
for (const finding of findings) console.log(finding)
console.error(`\nai-lint: ${findings.length} finding(s)`)
process.exit(1)
