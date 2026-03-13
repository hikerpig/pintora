/**
 * 颜色工具函数 - 用于主题颜色测试
 * 提供颜色转换、对比度计算等功能
 */

export interface RGBColor {
  r: number
  g: number
  b: number
}

export interface HSLColor {
  h: number
  s: number
  l: number
}

/**
 * 将十六进制颜色转换为 RGB
 */
export function hexToRgb(hex: string): RGBColor | null {
  // 移除 # 前缀
  hex = hex.replace(/^#/, '')

  // 处理简写格式 (如 #fff)
  if (hex.length === 3) {
    hex = hex
      .split('')
      .map(c => c + c)
      .join('')
  }

  // 处理带透明度的格式 (如 #ffffffaa)
  if (hex.length === 8) {
    hex = hex.slice(0, 6)
  }

  const result = /^([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  if (!result) return null

  return {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16),
  }
}

/**
 * 将 RGB 转换为十六进制
 */
export function rgbToHex(rgb: RGBColor): string {
  const toHex = (n: number) => {
    const hex = Math.round(n).toString(16)
    return hex.length === 1 ? '0' + hex : hex
  }
  return `#${toHex(rgb.r)}${toHex(rgb.g)}${toHex(rgb.b)}`
}

/**
 * 将 RGB 转换为 HSL
 */
export function rgbToHsl(rgb: RGBColor): HSLColor {
  const r = rgb.r / 255
  const g = rgb.g / 255
  const b = rgb.b / 255

  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  let h = 0
  let s = 0
  const l = (max + min) / 2

  if (max !== min) {
    const d = max - min
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min)

    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0)
        break
      case g:
        h = (b - r) / d + 2
        break
      case b:
        h = (r - g) / d + 4
        break
    }
    h /= 6
  }

  return {
    h: Math.round(h * 360),
    s: Math.round(s * 100),
    l: Math.round(l * 100),
  }
}

/**
 * 计算相对亮度 (Relative Luminance)
 * 基于 WCAG 2.1 标准
 */
export function getRelativeLuminance(rgb: RGBColor): number {
  const toLinear = (c: number) => {
    c = c / 255
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
  }

  const r = toLinear(rgb.r)
  const g = toLinear(rgb.g)
  const b = toLinear(rgb.b)

  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

/**
 * 计算两个颜色之间的对比度
 * 基于 WCAG 2.1 标准
 */
export function getContrastRatio(color1: string, color2: string): number {
  const rgb1 = hexToRgb(color1)
  const rgb2 = hexToRgb(color2)

  if (!rgb1 || !rgb2) {
    throw new Error(`Invalid color format: ${color1} or ${color2}`)
  }

  const lum1 = getRelativeLuminance(rgb1)
  const lum2 = getRelativeLuminance(rgb2)

  const lighter = Math.max(lum1, lum2)
  const darker = Math.min(lum1, lum2)

  return (lighter + 0.05) / (darker + 0.05)
}

/**
 * WCAG 对比度等级
 */
export enum ContrastLevel {
  FAIL = 'FAIL',
  AA_LARGE = 'AA_LARGE', // 3:1 for large text
  AA = 'AA', // 4.5:1 for normal text
  AAA = 'AAA', // 7:1 for normal text
}

/**
 * 检查对比度等级
 */
export function checkContrastLevel(ratio: number, isLargeText = false): ContrastLevel {
  if (ratio >= 7) return ContrastLevel.AAA
  if (ratio >= 4.5) return ContrastLevel.AA
  if (ratio >= 3 && isLargeText) return ContrastLevel.AA_LARGE
  return ContrastLevel.FAIL
}

/**
 * 获取对比度建议
 */
export function getContrastSuggestion(ratio: number, isLargeText = false): string {
  const level = checkContrastLevel(ratio, isLargeText)

  switch (level) {
    case ContrastLevel.AAA:
      return '优秀 - 符合 WCAG AAA 标准'
    case ContrastLevel.AA:
      return '良好 - 符合 WCAG AA 标准'
    case ContrastLevel.AA_LARGE:
      return '可接受 - 仅适用于大字体'
    case ContrastLevel.FAIL:
      return `不合格 - 对比度 ${ratio.toFixed(2)}:1 过低，建议至少 ${isLargeText ? '3:1' : '4.5:1'}`
  }
}

/**
 * 判断颜色是否为深色
 */
export function isDarkColor(color: string): boolean {
  const rgb = hexToRgb(color)
  if (!rgb) return false

  // 基于亮度判断
  const luminance = getRelativeLuminance(rgb)
  return luminance < 0.5
}

/**
 * 计算颜色相似度 (0-1, 1 表示完全相同)
 */
export function getColorSimilarity(color1: string, color2: string): number {
  const rgb1 = hexToRgb(color1)
  const rgb2 = hexToRgb(color2)

  if (!rgb1 || !rgb2) return 0

  // 使用欧几里得距离计算
  const distance = Math.sqrt(Math.pow(rgb1.r - rgb2.r, 2) + Math.pow(rgb1.g - rgb2.g, 2) + Math.pow(rgb1.b - rgb2.b, 2))

  // 最大距离是 sqrt(255^2 * 3) ≈ 441.67
  return 1 - distance / 441.67
}

/**
 * 判断两个颜色是否过于相似（可能导致视觉区分困难）
 */
export function areColorsTooSimilar(color1: string, color2: string, threshold = 0.8): boolean {
  return getColorSimilarity(color1, color2) > threshold
}

/**
 * 生成颜色的变体（用于测试颜色层次）
 */
export function generateColorVariants(baseColor: string, count: number): string[] {
  const rgb = hexToRgb(baseColor)
  if (!rgb) return []

  const hsl = rgbToHsl(rgb)
  const variants: string[] = []

  for (let i = 0; i < count; i++) {
    // 调整亮度生成变体
    const lightnessVariation = (i / (count - 1)) * 40 - 20 // -20% to +20%
    const newL = Math.max(0, Math.min(100, hsl.l + lightnessVariation))

    // 简单的 HSL 到 RGB 转换
    const h = hsl.h / 360
    const s = hsl.s / 100
    const l = newL / 100

    let r, g, b

    if (s === 0) {
      r = g = b = l
    } else {
      const hue2rgb = (p: number, q: number, t: number) => {
        if (t < 0) t += 1
        if (t > 1) t -= 1
        if (t < 1 / 6) return p + (q - p) * 6 * t
        if (t < 1 / 2) return q
        if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6
        return p
      }

      const q = l < 0.5 ? l * (1 + s) : l + s - l * s
      const p = 2 * l - q
      r = hue2rgb(p, q, h + 1 / 3)
      g = hue2rgb(p, q, h)
      b = hue2rgb(p, q, h - 1 / 3)
    }

    variants.push(
      rgbToHex({
        r: Math.round(r * 255),
        g: Math.round(g * 255),
        b: Math.round(b * 255),
      }),
    )
  }

  return variants
}

/**
 * 颜色和谐度检查 - 检查颜色是否在色轮上分布合理
 */
export function checkColorHarmony(colors: string[]): {
  score: number
  issues: string[]
} {
  const hslColors = colors
    .map(c => {
      const rgb = hexToRgb(c)
      return rgb ? rgbToHsl(rgb) : null
    })
    .filter(Boolean) as HSLColor[]

  if (hslColors.length < 2) {
    return { score: 1, issues: [] }
  }

  const issues: string[] = []
  let harmonyScore = 1

  // 检查色相分布
  const hues = hslColors.map(c => c.h).sort((a, b) => a - b)
  const hueDiffs: number[] = []

  for (let i = 1; i < hues.length; i++) {
    let diff = hues[i] - hues[i - 1]
    // 处理色环环绕
    if (diff > 180) diff = 360 - diff
    hueDiffs.push(diff)
  }

  // 检查是否有颜色过于集中
  const avgDiff = hueDiffs.reduce((a, b) => a + b, 0) / hueDiffs.length
  const variance = hueDiffs.reduce((sum, diff) => sum + Math.pow(diff - avgDiff, 2), 0) / hueDiffs.length

  if (variance < 100) {
    harmonyScore -= 0.2
    issues.push('颜色色相分布过于集中，建议增加色相差异')
  }

  // 检查饱和度一致性
  const saturations = hslColors.map(c => c.s)
  const avgSat = saturations.reduce((a, b) => a + b, 0) / saturations.length
  const satVariance = saturations.reduce((sum, s) => sum + Math.pow(s - avgSat, 2), 0) / saturations.length

  if (satVariance > 400) {
    harmonyScore -= 0.15
    issues.push('颜色饱和度差异过大，建议统一饱和度水平')
  }

  // 检查亮度一致性
  const lightnesses = hslColors.map(c => c.l)
  const avgLight = lightnesses.reduce((a, b) => a + b, 0) / lightnesses.length
  const lightVariance = lightnesses.reduce((sum, l) => sum + Math.pow(l - avgLight, 2), 0) / lightnesses.length

  if (lightVariance > 400) {
    harmonyScore -= 0.15
    issues.push('颜色亮度差异过大，建议统一亮度水平')
  }

  return {
    score: Math.max(0, harmonyScore),
    issues,
  }
}
