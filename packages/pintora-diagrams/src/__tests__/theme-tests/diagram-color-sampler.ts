/**
 * 图表颜色采样器
 * 渲染图表并从中提取实际使用的颜色
 */

import { GraphicsIR, ITheme, themeRegistry, parseAndDraw, DrawOptions } from '@pintora/core'

export interface ColorSample {
  color: string
  elementType: string
  context: string
  bounds?: { x: number; y: number; width: number; height: number }
}

export interface DiagramColorSamples {
  diagramType: string
  code: string
  themeName: string
  samples: ColorSample[]
  uniqueColors: string[]
  summary: {
    totalElements: number
    backgroundColors: number
    textColors: number
    lineColors: number
    fillColors: number
    borderColors: number
  }
}

/**
 * 从 GraphicsIR 中提取所有颜色
 */
export function extractColorsFromGraphicsIR(
  ir: GraphicsIR,
  diagramType: string,
  code: string,
  themeName: string
): DiagramColorSamples {
  const samples: ColorSample[] = []
  const colorSet = new Set<string>()

  // 递归遍历 mark 树
  function traverseMark(mark: any, context: string = 'root') {
    if (!mark) return

    // 处理数组
    if (Array.isArray(mark)) {
      mark.forEach((m, i) => traverseMark(m, `${context}[${i}]`))
      return
    }

    const elementType = mark.type || 'unknown'
    const newContext = `${context}.${elementType}`

    // 从 attrs 中提取颜色相关属性
    if (mark.attrs) {
      const attrs = mark.attrs
      
      // 填充颜色
      if (attrs.fill && attrs.fill !== 'none' && attrs.fill !== 'transparent') {
        const color = normalizeColor(attrs.fill)
        if (color) {
          samples.push({
            color,
            elementType,
            context: `${newContext}.fill`,
            bounds: mark.attrs.bounds,
          })
          colorSet.add(color)
        }
      }

      // 描边颜色
      if (attrs.stroke && attrs.stroke !== 'none') {
        const color = normalizeColor(attrs.stroke)
        if (color) {
          samples.push({
            color,
            elementType,
            context: `${newContext}.stroke`,
            bounds: mark.attrs.bounds,
          })
          colorSet.add(color)
        }
      }

      // 文本颜色
      if (attrs.fill && elementType === 'text') {
        const color = normalizeColor(attrs.fill)
        if (color) {
          samples.push({
            color,
            elementType: 'text',
            context: `${newContext}.textFill`,
            bounds: mark.attrs.bounds,
          })
          colorSet.add(color)
        }
      }

      // 背景颜色
      if (attrs.bgColor) {
        const color = normalizeColor(attrs.bgColor)
        if (color) {
          samples.push({
            color,
            elementType,
            context: `${newContext}.bgColor`,
            bounds: mark.attrs.bounds,
          })
          colorSet.add(color)
        }
      }
    }

    // 递归处理子元素
    if (mark.children && Array.isArray(mark.children)) {
      mark.children.forEach((child: any, i: number) => {
        traverseMark(child, `${newContext}.children[${i}]`)
      })
    }
  }

  // 开始遍历
  if (ir.mark) {
    traverseMark(ir.mark, diagramType)
  }

  // 统计
  const summary = {
    totalElements: samples.length,
    backgroundColors: samples.filter(s => s.context.includes('bgColor')).length,
    textColors: samples.filter(s => s.elementType === 'text').length,
    lineColors: samples.filter(s => s.elementType === 'line' || s.context.includes('stroke')).length,
    fillColors: samples.filter(s => s.context.includes('fill') && s.elementType !== 'text').length,
    borderColors: samples.filter(s => s.context.includes('stroke')).length,
  }

  return {
    diagramType,
    code,
    themeName,
    samples,
    uniqueColors: Array.from(colorSet),
    summary,
  }
}

/**
 * 规范化颜色值
 */
function normalizeColor(color: string): string | null {
  if (!color || color === 'none' || color === 'transparent') {
    return null
  }

  // 已经是十六进制
  if (color.startsWith('#')) {
    return color.toLowerCase()
  }

  // 处理 named colors (简化处理，实际可能需要更完整的映射)
  const namedColors: Record<string, string> = {
    'black': '#000000',
    'white': '#ffffff',
    'red': '#ff0000',
    'green': '#008000',
    'blue': '#0000ff',
    'yellow': '#ffff00',
    'orange': '#ffa500',
    'purple': '#800080',
    'pink': '#ffc0cb',
    'gray': '#808080',
    'grey': '#808080',
  }

  if (namedColors[color.toLowerCase()]) {
    return namedColors[color.toLowerCase()]
  }

  // 处理 rgb/rgba
  const rgbMatch = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/)
  if (rgbMatch) {
    const r = parseInt(rgbMatch[1]).toString(16).padStart(2, '0')
    const g = parseInt(rgbMatch[2]).toString(16).padStart(2, '0')
    const b = parseInt(rgbMatch[3]).toString(16).padStart(2, '0')
    return `#${r}${g}${b}`.toLowerCase()
  }

  return color.toLowerCase()
}

/**
 * 渲染图表并采样颜色
 */
export function sampleDiagramColors(
  diagramType: string,
  code: string,
  themeName: string = 'default'
): DiagramColorSamples | null {
  try {
    // 设置主题
    const theme = themeRegistry.themes[themeName]
    if (!theme) {
      throw new Error(`Theme not found: ${themeName}`)
    }

    // 解析并绘制
    const options: DrawOptions = {}

    const result = parseAndDraw(code, options)
    if (!result) {
      throw new Error('Failed to parse and draw diagram')
    }

    return extractColorsFromGraphicsIR(result.graphicIR, diagramType, code, themeName)
  } catch (error) {
    console.error(`Error sampling colors for ${diagramType} with theme ${themeName}:`, error)
    return null
  }
}

/**
 * 批量采样多个图表的颜色
 */
export interface DiagramExample {
  type: string
  code: string
  name?: string
}

export function sampleMultipleDiagrams(
  examples: DiagramExample[],
  themeName: string
): DiagramColorSamples[] {
  const results: DiagramColorSamples[] = []

  for (const example of examples) {
    const samples = sampleDiagramColors(example.type, example.code, themeName)
    if (samples) {
      results.push(samples)
    }
  }

  return results
}

/**
 * 比较同一图表在不同主题下的颜色
 */
export function compareDiagramColorsAcrossThemes(
  diagramType: string,
  code: string,
  themeNames: string[]
): Record<string, DiagramColorSamples | null> {
  const results: Record<string, DiagramColorSamples | null> = {}

  for (const themeName of themeNames) {
    results[themeName] = sampleDiagramColors(diagramType, code, themeName)
  }

  return results
}

/**
 * 分析颜色使用模式
 */
export interface ColorUsagePattern {
  mostUsedColors: { color: string; count: number }[]
  colorDistribution: Record<string, number>
  uniqueColorCount: number
  dominantColors: string[]
}

export function analyzeColorUsage(samples: DiagramColorSamples): ColorUsagePattern {
  // 统计颜色使用频率
  const colorCount: Record<string, number> = {}
  samples.samples.forEach(s => {
    colorCount[s.color] = (colorCount[s.color] || 0) + 1
  })

  // 排序
  const sortedColors = Object.entries(colorCount)
    .sort((a, b) => b[1] - a[1])
    .map(([color, count]) => ({ color, count }))

  // 找出主导颜色（使用频率最高的前 5 个）
  const dominantColors = sortedColors.slice(0, 5).map(c => c.color)

  return {
    mostUsedColors: sortedColors.slice(0, 10),
    colorDistribution: colorCount,
    uniqueColorCount: samples.uniqueColors.length,
    dominantColors,
  }
}

/**
 * 检查颜色是否符合主题预期
 */
export interface ColorThemeCompliance {
  expectedColors: string[]
  actualColors: string[]
  unexpectedColors: string[]
  missingColors: string[]
  compliance: number // 0-1
}

export function checkColorThemeCompliance(
  samples: DiagramColorSamples,
  expectedColors: string[]
): ColorThemeCompliance {
  const actualColors = samples.uniqueColors
  
  const unexpectedColors = actualColors.filter(c => !expectedColors.includes(c))
  const missingColors = expectedColors.filter(c => !actualColors.includes(c))
  
  const matchedColors = actualColors.filter(c => expectedColors.includes(c)).length
  const compliance = expectedColors.length > 0 
    ? matchedColors / expectedColors.length 
    : 1

  return {
    expectedColors,
    actualColors,
    unexpectedColors,
    missingColors,
    compliance,
  }
}

/**
 * 生成颜色采样报告
 */
export function generateColorSamplingReport(samples: DiagramColorSamples): string {
  const lines: string[] = []
  
  lines.push(`# 图表颜色采样报告`)
  lines.push('')
  lines.push(`## 基本信息`)
  lines.push(`- 图表类型: ${samples.diagramType}`)
  lines.push(`- 主题: ${samples.themeName}`)
  lines.push(`- 唯一颜色数: ${samples.uniqueColors.length}`)
  lines.push('')

  lines.push(`## 统计摘要`)
  lines.push(`- 总元素数: ${samples.summary.totalElements}`)
  lines.push(`- 背景颜色: ${samples.summary.backgroundColors}`)
  lines.push(`- 文本颜色: ${samples.summary.textColors}`)
  lines.push(`- 线条颜色: ${samples.summary.lineColors}`)
  lines.push(`- 填充颜色: ${samples.summary.fillColors}`)
  lines.push(`- 边框颜色: ${samples.summary.borderColors}`)
  lines.push('')

  // 颜色使用分析
  const analysis = analyzeColorUsage(samples)
  lines.push(`## 颜色使用分析`)
  lines.push('')
  lines.push(`### 最常用颜色`)
  analysis.mostUsedColors.slice(0, 10).forEach(({ color, count }) => {
    const percentage = ((count / samples.summary.totalElements) * 100).toFixed(1)
    lines.push(`- ${color}: ${count} 次 (${percentage}%)`)
  })
  lines.push('')

  lines.push(`### 主导颜色`)
  analysis.dominantColors.forEach(color => {
    lines.push(`- ${color}`)
  })
  lines.push('')

  lines.push(`## 所有唯一颜色`)
  samples.uniqueColors.forEach(color => {
    lines.push(`- ${color}`)
  })

  return lines.join('\n')
}
