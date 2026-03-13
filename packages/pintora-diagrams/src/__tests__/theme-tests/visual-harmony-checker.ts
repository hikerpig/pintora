/**
 * 视觉和谐度检查器
 * 检查主题颜色的视觉和谐度、美观度
 */

import {
  hexToRgb,
  rgbToHsl,
  HSLColor,
  RGBColor,
  areColorsTooSimilar,
  checkColorHarmony,
  isDarkColor,
} from './color-utils'
import { ThemeColorSet } from './theme-color-extractor'

export interface HarmonyCheckResult {
  category: string
  score: number // 0-1
  issues: string[]
  details?: Record<string, unknown>
}

export interface VisualHarmonyReport {
  themeName: string
  isDark: boolean
  overallScore: number
  categories: HarmonyCheckResult[]
  summary: {
    totalIssues: number
    criticalIssues: number
    warnings: number
  }
  recommendations: string[]
}

/**
 * 检查颜色区分度
 * 确保不同用途的颜色有足够的区分度
 */
function checkColorDistinctiveness(themeColors: ThemeColorSet): HarmonyCheckResult {
  const issues: string[] = []
  const allColors = [
    themeColors.primary,
    themeColors.secondary,
    themeColors.tertiary,
    ...themeColors.lines,
    ...themeColors.borders,
  ]

  // 检查强调色是否过于相似
  const accentColors = [themeColors.primary, themeColors.secondary, themeColors.tertiary]
  for (let i = 0; i < accentColors.length; i++) {
    for (let j = i + 1; j < accentColors.length; j++) {
      if (areColorsTooSimilar(accentColors[i], accentColors[j], 0.7)) {
        issues.push(`强调色 ${i + 1} 和 ${j + 1} 过于相似 (${accentColors[i]} vs ${accentColors[j]})`)
      }
    }
  }

  // 检查线条和边框颜色是否有足够区分
  if (themeColors.lines.length > 1) {
    for (let i = 0; i < themeColors.lines.length - 1; i++) {
      if (areColorsTooSimilar(themeColors.lines[i], themeColors.lines[i + 1], 0.85)) {
        issues.push(`线条颜色 ${i + 1} 和 ${i + 2} 过于相似`)
      }
    }
  }

  // 计算整体区分度分数
  let distinctScore = 1
  if (issues.length > 0) {
    distinctScore = Math.max(0, 1 - issues.length * 0.15)
  }

  return {
    category: '颜色区分度',
    score: distinctScore,
    issues,
    details: {
      totalColors: allColors.length,
      similarPairs: issues.length,
    },
  }
}

/**
 * 检查背景层次
 * 确保背景颜色有适当的层次感
 */
function checkBackgroundHierarchy(themeColors: ThemeColorSet): HarmonyCheckResult {
  const issues: string[] = []
  const backgrounds = [themeColors.background, ...themeColors.backgrounds]

  if (backgrounds.length < 2) {
    return {
      category: '背景层次',
      score: 0.7,
      issues: ['背景颜色层次较少，可能影响视觉深度'],
    }
  }

  // 检查背景亮度层次
  const lightnesses = backgrounds.map(color => {
    const rgb = hexToRgb(color)
    if (!rgb) return 50
    const hsl = rgbToHsl(rgb)
    return hsl.l
  })

  // 检查是否有足够的亮度差异
  const minLight = Math.min(...lightnesses)
  const maxLight = Math.max(...lightnesses)
  const lightRange = maxLight - minLight

  if (lightRange < 10) {
    issues.push(`背景亮度范围过小 (${lightRange.toFixed(1)}%)，建议增加层次差异`)
  }

  // 检查背景色是否过于跳跃
  const sortedLights = [...lightnesses].sort((a, b) => a - b)
  for (let i = 1; i < sortedLights.length; i++) {
    const diff = sortedLights[i] - sortedLights[i - 1]
    if (diff < 3) {
      issues.push(`背景层次 ${i} 和 ${i + 1} 的亮度差异过小 (${diff.toFixed(1)}%)`)
    }
  }

  const score = Math.max(0, 1 - issues.length * 0.2)

  return {
    category: '背景层次',
    score,
    issues,
    details: {
      lightnessRange: lightRange,
      lightnessValues: lightnesses,
    },
  }
}

/**
 * 检查色彩和谐度
 */
function checkColorHarmonyScore(themeColors: ThemeColorSet): HarmonyCheckResult {
  const accentColors = [themeColors.primary, themeColors.secondary, themeColors.tertiary]
  const harmony = checkColorHarmony(accentColors)

  return {
    category: '色彩和谐度',
    score: harmony.score,
    issues: harmony.issues,
    details: {
      analyzedColors: accentColors.length,
    },
  }
}

/**
 * 检查主题一致性
 * 确保深色/浅色主题的一致性
 */
function checkThemeConsistency(themeColors: ThemeColorSet): HarmonyCheckResult {
  const issues: string[] = []

  // 检查背景是否符合主题类型
  const isBgDark = isDarkColor(themeColors.background)
  if (themeColors.isDark && !isBgDark) {
    issues.push('深色主题使用了浅色背景')
  } else if (!themeColors.isDark && isBgDark) {
    issues.push('浅色主题使用了深色背景')
  }

  // 检查文本颜色是否与背景协调
  const isTextDark = isDarkColor(themeColors.text)
  if (isBgDark === isTextDark) {
    issues.push(`文本颜色与背景对比可能不足 (都是${isBgDark ? '深色' : '浅色'})`)
  }

  // 检查强调色在主题中的适用性
  const accentColors = [themeColors.primary, themeColors.secondary, themeColors.tertiary]
  const darkAccents = accentColors.filter(isDarkColor).length
  
  if (themeColors.isDark && darkAccents > 1) {
    issues.push('深色主题中深色强调色过多，可能不够醒目')
  } else if (!themeColors.isDark && darkAccents < 1) {
    issues.push('浅色主题中浅色强调色过多，可能不够醒目')
  }

  const score = Math.max(0, 1 - issues.length * 0.25)

  return {
    category: '主题一致性',
    score,
    issues,
    details: {
      isBackgroundDark: isBgDark,
      isTextDark,
      darkAccentCount: darkAccents,
    },
  }
}

/**
 * 检查颜色饱和度平衡
 */
function checkSaturationBalance(themeColors: ThemeColorSet): HarmonyCheckResult {
  const issues: string[] = []
  
  const allColors = [
    themeColors.primary,
    themeColors.secondary,
    themeColors.tertiary,
  ]

  const saturations = allColors.map(color => {
    const rgb = hexToRgb(color)
    if (!rgb) return 0
    const hsl = rgbToHsl(rgb)
    return hsl.s
  })

  const avgSat = saturations.reduce((a, b) => a + b, 0) / saturations.length
  const variance = saturations.reduce((sum, s) => sum + Math.pow(s - avgSat, 2), 0) / saturations.length

  if (avgSat < 20) {
    issues.push('整体饱和度偏低，主题可能显得单调')
  } else if (avgSat > 80) {
    issues.push('整体饱和度偏高，主题可能过于刺眼')
  }

  if (variance > 400) {
    issues.push('颜色饱和度差异过大，缺乏统一感')
  }

  const score = Math.max(0, 1 - issues.length * 0.3)

  return {
    category: '饱和度平衡',
    score,
    issues,
    details: {
      averageSaturation: avgSat.toFixed(1),
      saturationVariance: variance.toFixed(1),
      saturationValues: saturations,
    },
  }
}

/**
 * 检查色温平衡
 */
function checkColorTemperature(themeColors: ThemeColorSet): HarmonyCheckResult {
  const issues: string[] = []
  
  const accentColors = [themeColors.primary, themeColors.secondary, themeColors.tertiary]
  
  // 简单判断色温（基于色相）
  const temperatures = accentColors.map(color => {
    const rgb = hexToRgb(color)
    if (!rgb) return 'neutral'
    const hsl = rgbToHsl(rgb)
    
    // 暖色: 0-60, 300-360
    // 冷色: 60-180
    // 中性: 180-300
    if (hsl.h <= 60 || hsl.h >= 300) return 'warm'
    if (hsl.h >= 180 && hsl.h <= 300) return 'cool'
    return 'neutral'
  })

  const warmCount = temperatures.filter(t => t === 'warm').length
  const coolCount = temperatures.filter(t => t === 'cool').length

  if (warmCount === 0) {
    issues.push('缺少暖色调，主题可能显得冷淡')
  } else if (coolCount === 0) {
    issues.push('缺少冷色调，主题可能显得燥热')
  }

  // 检查是否冷暖平衡
  if (Math.abs(warmCount - coolCount) > 2) {
    issues.push('冷暖色调不平衡')
  }

  const score = Math.max(0, 1 - issues.length * 0.3)

  return {
    category: '色温平衡',
    score,
    issues,
    details: {
      warmColors: warmCount,
      coolColors: coolCount,
      temperatureDistribution: temperatures,
    },
  }
}

/**
 * 执行完整的视觉和谐度检查
 */
export function checkVisualHarmony(themeColors: ThemeColorSet): VisualHarmonyReport {
  const categories = [
    checkColorDistinctiveness(themeColors),
    checkBackgroundHierarchy(themeColors),
    checkColorHarmonyScore(themeColors),
    checkThemeConsistency(themeColors),
    checkSaturationBalance(themeColors),
    checkColorTemperature(themeColors),
  ]

  // 计算总体分数（加权平均）
  const weights = {
    '颜色区分度': 0.25,
    '背景层次': 0.15,
    '色彩和谐度': 0.2,
    '主题一致性': 0.2,
    '饱和度平衡': 0.1,
    '色温平衡': 0.1,
  }

  const overallScore = categories.reduce((sum, cat) => {
    return sum + cat.score * (weights[cat.category as keyof typeof weights] || 0.1)
  }, 0)

  const allIssues = categories.flatMap(c => c.issues)
  const criticalIssues = allIssues.filter(i => 
    i.includes('深色主题') || 
    i.includes('浅色主题') ||
    i.includes('文本颜色与背景')
  ).length

  // 生成建议
  const recommendations: string[] = []
  
  categories.forEach(cat => {
    if (cat.score < 0.6) {
      recommendations.push(`[${cat.category}] 需要改进: ${cat.issues[0]}`)
    }
  })

  if (overallScore < 0.7) {
    recommendations.push('主题整体视觉和谐度较低，建议重新调整配色方案')
  }

  return {
    themeName: themeColors.name,
    isDark: themeColors.isDark,
    overallScore: Math.round(overallScore * 100) / 100,
    categories,
    summary: {
      totalIssues: allIssues.length,
      criticalIssues,
      warnings: allIssues.length - criticalIssues,
    },
    recommendations,
  }
}

/**
 * 生成视觉和谐度报告文本
 */
export function generateHarmonyReportText(report: VisualHarmonyReport): string {
  const lines: string[] = []
  
  lines.push(`# 视觉和谐度检查报告: ${report.themeName}`)
  lines.push('')
  lines.push(`## 总体评分: ${(report.overallScore * 100).toFixed(0)}/100`)
  lines.push('')
  lines.push(`## 问题汇总`)
  lines.push(`- 总问题数: ${report.summary.totalIssues}`)
  lines.push(`- 严重问题: ${report.summary.criticalIssues}`)
  lines.push(`- 警告: ${report.summary.warnings}`)
  lines.push('')

  lines.push(`## 分类评分`)
  lines.push('')
  report.categories.forEach(cat => {
    const emoji = cat.score >= 0.8 ? '✅' : cat.score >= 0.6 ? '⚠️' : '❌'
    lines.push(`### ${emoji} ${cat.category}: ${(cat.score * 100).toFixed(0)}/100`)
    
    if (cat.issues.length > 0) {
      lines.push('**问题:**')
      cat.issues.forEach(issue => {
        lines.push(`- ${issue}`)
      })
    }
    
    if (cat.details) {
      lines.push('**详情:**')
      Object.entries(cat.details).forEach(([key, value]) => {
        lines.push(`- ${key}: ${JSON.stringify(value)}`)
      })
    }
    lines.push('')
  })

  if (report.recommendations.length > 0) {
    lines.push(`## 改进建议`)
    lines.push('')
    report.recommendations.forEach((rec, index) => {
      lines.push(`${index + 1}. ${rec}`)
    })
    lines.push('')
  }

  return lines.join('\n')
}

/**
 * 比较两个主题的视觉和谐度
 */
export function compareThemeHarmony(
  report1: VisualHarmonyReport,
  report2: VisualHarmonyReport
): {
  better: string
  scoreDiff: number
  categoryComparisons: { category: string; winner: string; diff: number }[]
} {
  const scoreDiff = report1.overallScore - report2.overallScore
  
  const categoryComparisons = report1.categories.map((cat1, index) => {
    const cat2 = report2.categories[index]
    const diff = cat1.score - cat2.score
    return {
      category: cat1.category,
      winner: diff > 0 ? report1.themeName : diff < 0 ? report2.themeName : 'tie',
      diff: Math.abs(diff),
    }
  })

  return {
    better: scoreDiff > 0 ? report1.themeName : report2.themeName,
    scoreDiff: Math.abs(scoreDiff),
    categoryComparisons,
  }
}
