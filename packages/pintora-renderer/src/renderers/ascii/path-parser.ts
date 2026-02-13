import { PathCommand } from '@pintora/core'

export type ParsedCommand = {
  cmd: string
  values: number[]
}

const PATH_PARAM_COUNTS: Record<string, number> = {
  M: 2,
  L: 2,
  H: 1,
  V: 1,
  C: 6,
  S: 4,
  Q: 4,
  T: 2,
  A: 7,
  Z: 0,
}

function isCommandToken(token: string): boolean {
  return /^[AaCcHhLlMmQqSsTtVvZz]$/.test(token)
}

function tokenizePath(path: string): string[] {
  return path.match(/[AaCcHhLlMmQqSsTtVvZz]|[-+]?(?:\d*\.\d+|\d+)(?:[eE][-+]?\d+)?/g) || []
}

function parsePathString(path: string): ParsedCommand[] {
  const tokens = tokenizePath(path)
  const output: ParsedCommand[] = []
  let currentCommand = ''
  let i = 0

  while (i < tokens.length) {
    const token = tokens[i]
    if (isCommandToken(token)) {
      currentCommand = token
      i++
      if (currentCommand.toUpperCase() === 'Z') {
        output.push({ cmd: currentCommand, values: [] })
        continue
      }
    }

    if (!currentCommand) {
      i++
      continue
    }

    const upper = currentCommand.toUpperCase()
    const paramCount = PATH_PARAM_COUNTS[upper]
    if (paramCount === undefined) {
      i++
      continue
    }

    if (upper === 'M') {
      let first = true
      while (i + 1 < tokens.length && !isCommandToken(tokens[i]) && !isCommandToken(tokens[i + 1])) {
        const values = [Number(tokens[i]), Number(tokens[i + 1])]
        output.push({ cmd: first ? currentCommand : currentCommand === 'm' ? 'l' : 'L', values })
        first = false
        i += 2
      }
      continue
    }

    while (i + paramCount - 1 < tokens.length && !isCommandToken(tokens[i])) {
      const values: number[] = []
      let valid = true
      for (let offset = 0; offset < paramCount; offset++) {
        const t = tokens[i + offset]
        if (!t || isCommandToken(t)) {
          valid = false
          break
        }
        values.push(Number(t))
      }
      if (!valid) break
      output.push({ cmd: currentCommand, values })
      i += paramCount
    }
  }

  return output
}

export function parsePath(path: string | PathCommand[]): ParsedCommand[] {
  if (Array.isArray(path)) {
    return path.map(command => {
      const [cmd, ...values] = command as [string, ...number[]]
      return { cmd, values }
    })
  }
  return parsePathString(path)
}
