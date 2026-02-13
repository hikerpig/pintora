function isCombiningCodePoint(codePoint: number): boolean {
  return (
    (codePoint >= 0x0300 && codePoint <= 0x036f) ||
    (codePoint >= 0x1ab0 && codePoint <= 0x1aff) ||
    (codePoint >= 0x1dc0 && codePoint <= 0x1dff) ||
    (codePoint >= 0x20d0 && codePoint <= 0x20ff) ||
    (codePoint >= 0xfe20 && codePoint <= 0xfe2f)
  )
}

function isFullwidthCodePoint(codePoint: number): boolean {
  if (codePoint < 0x1100) return false
  return (
    codePoint <= 0x115f ||
    codePoint === 0x2329 ||
    codePoint === 0x232a ||
    (codePoint >= 0x2e80 && codePoint <= 0x303e) ||
    (codePoint >= 0x3040 && codePoint <= 0xa4cf) ||
    (codePoint >= 0xac00 && codePoint <= 0xd7a3) ||
    (codePoint >= 0xf900 && codePoint <= 0xfaff) ||
    (codePoint >= 0xfe10 && codePoint <= 0xfe19) ||
    (codePoint >= 0xfe30 && codePoint <= 0xfe6f) ||
    (codePoint >= 0xff00 && codePoint <= 0xff60) ||
    (codePoint >= 0xffe0 && codePoint <= 0xffe6) ||
    (codePoint >= 0x1f300 && codePoint <= 0x1f64f) ||
    (codePoint >= 0x1f900 && codePoint <= 0x1f9ff) ||
    (codePoint >= 0x20000 && codePoint <= 0x3fffd)
  )
}

export function charWidth(ch: string): number {
  const codePoint = ch.codePointAt(0)
  if (!codePoint) return 0
  if ((codePoint >= 0 && codePoint <= 31) || (codePoint >= 0x7f && codePoint <= 0x9f)) return 0
  if (codePoint === 0x200d || (codePoint >= 0xfe00 && codePoint <= 0xfe0f) || isCombiningCodePoint(codePoint)) return 0
  return isFullwidthCodePoint(codePoint) ? 2 : 1
}

export function textDisplayWidth(text: string): number {
  let width = 0
  for (const ch of Array.from(text)) {
    width += charWidth(ch)
  }
  return width
}
