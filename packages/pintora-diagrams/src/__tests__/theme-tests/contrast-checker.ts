/**
 * 对比度检查器
 * 检查主题颜色对比度是否符合 WCAG 标准
 */

import {
  getContrastRatio,
  checkContrastLevel,
  ContrastLevel,
  getContrastSuggestion,
} from './color-utils'
import { ColorPair } from './theme-color-extractor'
import { ThemeColorSet, getThemeColorPairs, getDiagramSpecificColorPairs } from './theme-color-extractor'

export interface ContrastCheckResult {
  foreground: string
  background: string
  ratio: number
  level: ContrastLevel
  description: string
  importance: 'critical' | 'important' | 'normal'
  suggestion: string
  passed: boolean
}

export interface ThemeContrastReport {
  themeName: string
  isDark: boolean
  results: ContrastCheckResult[]
  summary: {
    total: number
    passed: number
    failed: number
    criticalPassed: number
    criticalTotal: number
    aaCompliant: number
    aaaCompliant: number
  }
  failedChecks: ContrastCheckResult[]
  recommendations: string[]
}

/**
 * 检查单个颜色对的对比度
 */
export function checkColorPair(pair: ColorPair): ContrastCheckResult {
  const ratio = getContrastRatio(pair.foreground, pair.background)
  const level = checkContrastLevel(ratio, false) // 假设为普通文本
  
  // 根据重要性确定通过标准
  let passed = false
  switch (pair.importance) {
    case 'critical':
      passed = level === ContrastLevel.AA || level === ContrastLevel.AAA
      break
    case 'important':
      passed = level === ContrastLevel.AA || level === ContrastLevel.AAA || level === ContrastLevel.AA_LARGE
      break
    case 'normal':
      passed = ratio >= 2 // 至少要有一些对比度
      break
  }

  return {
    foreground: pair.foreground,
    background: pair.background,
    ratio,
    level,
    description: pair.description,
    importance: pair.importance,
    suggestion: getContrastSuggestion(ratio, false),
    passed,
  }
}

/**
 * 检查主题的所有颜色对比度
 */
export function checkThemeContrast(themeColors: ThemeColorSet): ThemeContrastReport {
  const pairs = getThemeColorPairs(themeColors)
  const results = pairs.map(checkColorPair)

  const failedChecks = results.filter(r => !r.passed)
  const criticalChecks = results.filter(r => r.importance === 'critical')
  const criticalPassed = criticalChecks.filter(r => r.passed).length

  const aaCompliant = results.filter(r => 
    r.level === ContrastLevel.AA || r.level === ContrastLevel.AAA
  ).length

  const aaaCompliant = results.filter(r => 
    r.level === ContrastLevel.AAA
  ).length

  // 生成建议
  const recommendations: string[] = []
  
  if (criticalPassed < criticalChecks.length) {
    recommendations.push(`关键对比度检查未通过: ${criticalChecks.length - criticalPassed}/${criticalChecks.length}`)
  }

  // 检查是否有相似的失败模式
  const lowContrastOnBackground = failedChecks.filter(
    r => r.background === themeColors.background && r.importance === 'critical'
  )
  if (lowContrastOnBackground.length > 0) {
    recommendations.push(`背景色与 ${lowContrastOnBackground.length} 个前景色对比度不足，考虑调整背景亮度`)
  }

  // 检查文本颜色一致性
  const textColorResults = results.filter(r => r.description.includes('文本'))
  const textColorIssues = textColorResults.filter(r => !r.passed)
  if (textColorIssues.length > 0) {
    recommendations.push('文本可读性存在问题，建议调整文本颜色或背景颜色')
  }

  return {
    themeName: themeColors.name,
    isDark: themeColors.isDark,
    results,
    summary: {
      total: results.length,
      passed: results.length - failedChecks.length,
      failed: failedChecks.length,
      criticalPassed,
      criticalTotal: criticalChecks.length,
      aaCompliant,
      aaaCompliant,
    },
    failedChecks,
    recommendations,
  }
}

/**
 * 检查特定图表类型的对比度
 */
export function checkDiagramContrast(
  themeColors: ThemeColorSet,
  diagramType: string
): ThemeContrastReport {
  const pairs = getDiagramSpecificColorPairs(themeColors, diagramType)
  const results = pairs.map(checkColorPair)

  const failedChecks = results.filter(r => !r.passed)
  const criticalChecks = results.filter(r => r.importance === 'critical')
  const criticalPassed = criticalChecks.filter(r => r.passed).length

  return {
    themeName: `${themeColors.name} - ${diagramType}`,
    isDark: themeColors.isDark,
    results,
    summary: {
      total: results.length,
      passed: results.length - failedChecks.length,
      failed: failedChecks.length,
      criticalPassed,
      criticalTotal: criticalChecks.length,
      aaCompliant: results.filter(r => r.level === ContrastLevel.AA || r.level === ContrastLevel.AAA).length,
      aaaCompliant: results.filter(r => r.level === ContrastLevel.AAA).length,
    },
    failedChecks,
    recommendations: failedChecks.length > 0 
      ? [`${diagramType} 图表有 ${failedChecks.length} 个对比度问题`] 
      : [],
  }
}

/**
 * 对比度检查配置
 */
export interface ContrastCheckConfig {
  minCriticalRatio: number
  minImportantRatio: number
  minNormalRatio: number
  requireAA: boolean
  requireAAA: boolean
}

export const DEFAULT_CONTRAST_CONFIG: ContrastCheckConfig = {
  minCriticalRatio: 4.5, // WCAG AA for normal text
  minImportantRatio: 3, // WCAG AA for large text
  minNormalRatio: 2, // Minimum visible difference
  requireAA: true,
  requireAAA: false,
}

/**
 * 使用自定义配置检查对比度
 */
export function checkThemeContrastWithConfig(
  themeColors: ThemeColorSet,
  config: Partial<ContrastCheckConfig> = {}
): ThemeContrastReport {
  const fullConfig = { ...DEFAULT_CONTRAST_CONFIG, ...config }
  const baseReport = checkThemeContrast(themeColors)

  // 根据配置重新评估通过状态
  const reevaluatedResults = baseReport.results.map(result => {
    let passed = false
    switch (result.importance) {
      case 'critical':
        passed = result.ratio >= fullConfig.minCriticalRatio
        break
      case 'important':
        passed = result.ratio >= fullConfig.minImportantRatio
        break
      case 'normal':
        passed = result.ratio >= fullConfig.minNormalRatio
        break
    }

    if (fullConfig.requireAA) {
      passed = passed && (result.level === ContrastLevel.AA || result.level === ContrastLevel.AAA)
    }

    if (fullConfig.requireAAA) {
      passed = passed && result.level === ContrastLevel.AAA
    }

    return { ...result, passed }
  })

  const failedChecks = reevaluatedResults.filter(r => !r.passed)

  return {
    ...baseReport,
    results: reevaluatedResults,
    summary: {
      ...baseReport.summary,
      passed: reevaluatedResults.length - failedChecks.length,
      failed: failedChecks.length,
    },
    failedChecks,
  }
}

/**
 * 生成对比度检查报告文本
 */
export function generateContrastReportText(report: ThemeContrastReport): string {
  const lines: string[] = []
  
  lines.push(`# 主题对比度检查报告: ${report.themeName}`)
  lines.push('')
  lines.push(`## 概览`)
  lines.push(`- 主题类型: ${report.isDark ? '深色' : '浅色'}`)
  lines.push(`- 总检查项: ${report.summary.total}`)
  lines.push(`- 通过: ${report.summary.passed} ✅`)
  lines.push(`- 失败: ${report.summary.failed} ❌`)
  lines.push(`- 关键检查: ${report.summary.criticalPassed}/${report.summary.criticalTotal}`)
  lines.push(`- WCAG AA 合规: ${report.summary.aaCompliant}/${report.summary.total}`)
  lines.push(`- WCAG AAA 合规: ${report.summary.aaaCompliant}/${report.summary.total}`)
  lines.push('')

  if (report.failedChecks.length > 0) {
    lines.push(`## 失败的检查项`)
    lines.push('')
    report.failedChecks.forEach((check, index) => {
      lines.push(`### ${index + 1}. ${check.description}`)
      lines.push(`- 前景色: ${check.foreground}`)
      lines.push(`- 背景色: ${check.background}`)
      lines.push(`- 对比度: ${check.ratio.toFixed(2)}:1`)
      lines.push(`- 等级: ${check.level}`)
      lines.push(`- 重要性: ${check.importance}`)
      lines.push(`- 建议: ${check.suggestion}`)
      lines.push('')
    })
  }

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
 * 批量检查所有主题
 */
export function checkAllThemesContrast(themeColors: ThemeColorSet[]): ThemeContrastReport[] {
  return themeColors.map(theme => checkThemeContrast(theme))
}

/**
 * 找出对比度最差的颜色组合
 */
export function findWorstContrastPairs(
  report: ThemeContrastReport,
  limit = 5
): ContrastCheckResult[] {
  return [...report.results]
    .sort((a, b) => a.ratio - b.ratio)
    .slice(0, limit)
}

/**
 * 找出对比度最好的颜色组合
 */
export function findBestContrastPairs(
  report: ThemeContrastReport,
  limit = 5
): ContrastCheckResult[] {
  return [...report.results]
    .sort((a, b) => b.ratio - a.ratio)
    .slice(0, limit)
}
