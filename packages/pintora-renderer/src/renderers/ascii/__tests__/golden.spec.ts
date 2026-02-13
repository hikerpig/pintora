import fs from 'node:fs'
import path from 'node:path'
import { renderText } from '../render-text'
import { sequenceIr } from './fixtures/sequence-ir'

function normalizeWhitespace(input: string): string {
  const normalized = input.replace(/\r\n/g, '\n')
  const lines = normalized.split('\n').map(line => line.replace(/\s+$/g, ''))

  while (lines.length > 0 && lines[0] === '') {
    lines.shift()
  }
  while (lines.length > 0 && lines[lines.length - 1] === '') {
    lines.pop()
  }

  return lines.join('\n')
}

describe('ascii renderer golden', () => {
  const baseDir = path.resolve(__dirname, 'testdata')
  const cases = [
    {
      charset: 'unicode' as const,
      filePath: path.join(baseDir, 'unicode', 'sequence-basic.txt'),
    },
    {
      charset: 'ascii' as const,
      filePath: path.join(baseDir, 'ascii', 'sequence-basic.txt'),
    },
  ]

  it.each(cases)('matches golden output for $charset', ({ charset, filePath }) => {
    const expected = fs.readFileSync(filePath, 'utf8')
    const actual = renderText(sequenceIr, {
      charset,
      cellWidth: 8,
      cellHeight: 16,
      trimRight: true,
      ansi: false,
    })

    expect(normalizeWhitespace(actual)).toBe(normalizeWhitespace(expected))
  })
})
