/**
 * 主题测试套件
 * 整合所有主题测试功能
 */

import { ITheme, themeRegistry } from '@pintora/core'
import { ThemeColorSet, getAllThemeColors, extractThemeColors } from './theme-color-extractor'
import { 
  checkThemeContrast, 
  checkDiagramContrast, 
  checkAllThemesContrast,
  ThemeContrastReport,
  generateContrastReportText,
} from './contrast-checker'
import {
  checkVisualHarmony,
  VisualHarmonyReport,
  generateHarmonyReportText,
} from './visual-harmony-checker'
import {
  sampleDiagramColors,
  sampleMultipleDiagrams,
  DiagramColorSamples,
  generateColorSamplingReport,
} from './diagram-color-sampler'
import { EXAMPLES } from '@pintora/test-shared'

// 图表示例
const DIAGRAM_EXAMPLES = [
  { type: 'sequence', code: EXAMPLES.sequence.code, name: 'Sequence Diagram' },
  { type: 'er', code: EXAMPLES.er.code, name: 'ER Diagram' },
  { type: 'component', code: EXAMPLES.component.code, name: 'Component Diagram' },
  { type: 'activity', code: EXAMPLES.activity.code, name: 'Activity Diagram' },
  { type: 'mindmap', code: EXAMPLES.mindmap.code, name: 'Mind Map' },
  { type: 'gantt', code: EXAMPLES.gantt.code, name: 'Gantt Diagram' },
  { type: 'dot', code: EXAMPLES.dot.code, name: 'DOT Diagram' },
  { type: 'class', code: EXAMPLES.class.code, name: 'Class Diagram' },
]

export interface CompleteThemeTestReport {
  themeName: string
  timestamp: string
  contrastReport: ThemeContrastReport
  harmonyReport: VisualHarmonyReport
  diagramSamples: DiagramColorSamples[]
  overallScore: number
  passed: boolean
  issues: string[]
}

export interface TestSuiteConfig {
  themes: string[]
  diagrams: string[]
  checkContrast: boolean
  checkHarmony: boolean
  sampleColors: boolean
  minContrastScore: number
  minHarmonyScore: number
}

export const DEFAULT_TEST_CONFIG: TestSuiteConfig = {
  themes: Object.keys(themeRegistry.themes),
  diagrams: DIAGRAM_EXAMPLES.map(d => d.type),
  checkContrast: true,
  checkHarmony: true,
  sampleColors: true,
  minContrastScore: 0.8,
  minHarmonyScore: 0.7,
}

/**
 * 测试单个主题
 */
export function testSingleTheme(
  themeName: string,
  config: Partial<TestSuiteConfig> = {}
): CompleteThemeTestReport {
  const fullConfig = { ...DEFAULT_TEST_CONFIG, ...config }
  const theme = themeRegistry.themes[themeName]
  
  if (!theme) {
    throw new Error(`Theme not found: ${themeName}`)
  }

  const themeColors = extractThemeColors(themeName, theme)
  const issues: string[] = []

  // 对比度检查
  let contrastReport: ThemeContrastReport
  if (fullConfig.checkContrast) {
    contrastReport = checkThemeContrast(themeColors)
    
    const contrastScore = contrastReport.summary.passed / contrastReport.summary.total
    if (contrastScore < fullConfig.minContrastScore) {
      issues.push(`对比度检查未通过: ${(contrastScore * 100).toFixed(1)}% (要求 ${(fullConfig.minContrastScore * 100).toFixed(0)}%)`)
    }
    
    if (contrastReport.summary.criticalPassed < contrastReport.summary.criticalTotal) {
      issues.push(`关键对比度检查未通过: ${contrastReport.summary.criticalPassed}/${contrastReport.summary.criticalTotal}`)
    }
  } else {
    // 创建一个空的报告
    contrastReport = createEmptyContrastReport(themeName)
  }

  // 视觉和谐度检查
  let harmonyReport: VisualHarmonyReport
  if (fullConfig.checkHarmony) {
    harmonyReport = checkVisualHarmony(themeColors)
    
    if (harmonyReport.overallScore < fullConfig.minHarmonyScore) {
      issues.push(`视觉和谐度不足: ${(harmonyReport.overallScore * 100).toFixed(0)}/100 (要求 ${(fullConfig.minHarmonyScore * 100).toFixed(0)})`)
    }
    
    if (harmonyReport.summary.criticalIssues > 0) {
      issues.push(`存在 ${harmonyReport.summary.criticalIssues} 个严重的视觉和谐度问题`)
    }
  } else {
    harmonyReport = createEmptyHarmonyReport(themeName)
  }

  // 颜色采样
  let diagramSamples: DiagramColorSamples[] = []
  if (fullConfig.sampleColors) {
    const examples = DIAGRAM_EXAMPLES.filter(d => fullConfig.diagrams.includes(d.type))
    diagramSamples = sampleMultipleDiagrams(examples, themeName)
  }

  // 计算总体分数
  const contrastScore = contrastReport.summary.passed / Math.max(1, contrastReport.summary.total)
  const overallScore = (contrastScore * 0.6) + (harmonyReport.overallScore * 0.4)

  return {
    themeName,
    timestamp: new Date().toISOString(),
    contrastReport,
    harmonyReport,
    diagramSamples,
    overallScore: Math.round(overallScore * 100) / 100,
    passed: issues.length === 0,
    issues,
  }
}

/**
 * 测试所有主题
 */
export function testAllThemes(
  config: Partial<TestSuiteConfig> = {}
): CompleteThemeTestReport[] {
  const fullConfig = { ...DEFAULT_TEST_CONFIG, ...config }
  
  return fullConfig.themes.map(themeName => {
    try {
      return testSingleTheme(themeName, config)
    } catch (error) {
      console.error(`Error testing theme ${themeName}:`, error)
      return createErrorReport(themeName, error as Error)
    }
  })
}

/**
 * 生成完整测试报告
 */
export function generateCompleteReport(reports: CompleteThemeTestReport[]): string {
  const lines: string[] = []
  
  lines.push('# Pintora 主题颜色测试报告')
  lines.push('')
  lines.push(`生成时间: ${new Date().toLocaleString()}`)
  lines.push(`测试主题数: ${reports.length}`)
  lines.push(`通过: ${reports.filter(r => r.passed).length}`)
  lines.push(`失败: ${reports.filter(r => !r.passed).length}`)
  lines.push('')

  // 总体评分表
  lines.push('## 主题评分概览')
  lines.push('')
  lines.push('| 主题 | 总体评分 | 对比度 | 和谐度 | 状态 |')
  lines.push('|------|----------|--------|--------|------|')
  
  reports.forEach(report => {
    const contrastScore = (report.contrastReport.summary.passed / report.contrastReport.summary.total * 100).toFixed(0)
    const harmonyScore = (report.harmonyReport.overallScore * 100).toFixed(0)
    const status = report.passed ? '✅ 通过' : '❌ 失败'
    lines.push(`| ${report.themeName} | ${(report.overallScore * 100).toFixed(0)}/100 | ${contrastScore}% | ${harmonyScore}/100 | ${status} |`)
  })
  lines.push('')

  // 详细报告
  reports.forEach(report => {
    lines.push(`---`)
    lines.push('')
    lines.push(`# ${report.themeName}`)
    lines.push('')
    lines.push(`## 总体评分: ${(report.overallScore * 100).toFixed(0)}/100`)
    lines.push(`状态: ${report.passed ? '✅ 通过' : '❌ 失败'}`)
    lines.push('')

    if (report.issues.length > 0) {
      lines.push('### 问题列表')
      report.issues.forEach(issue => {
        lines.push(`- ❌ ${issue}`)
      })
      lines.push('')
    }

    // 对比度摘要
    lines.push('### 对比度检查')
    lines.push(`- 通过: ${report.contrastReport.summary.passed}/${report.contrastReport.summary.total}`)
    lines.push(`- 关键检查: ${report.contrastReport.summary.criticalPassed}/${report.contrastReport.summary.criticalTotal}`)
    lines.push(`- WCAG AA: ${report.contrastReport.summary.aaCompliant}/${report.contrastReport.summary.total}`)
    lines.push('')

    if (report.contrastReport.failedChecks.length > 0) {
      lines.push('**失败的对比度检查:**')
      report.contrastReport.failedChecks.slice(0, 5).forEach(check => {
        lines.push(`- ${check.description}: ${check.ratio.toFixed(2)}:1 (${check.level})`)
      })
      if (report.contrastReport.failedChecks.length > 5) {
        lines.push(`- ... 还有 ${report.contrastReport.failedChecks.length - 5} 个`)
      }
      lines.push('')
    }

    // 和谐度摘要
    lines.push('### 视觉和谐度')
    lines.push(`总体评分: ${(report.harmonyReport.overallScore * 100).toFixed(0)}/100`)
    lines.push('')
    lines.push('| 类别 | 评分 |')
    lines.push('|------|------|')
    report.harmonyReport.categories.forEach(cat => {
      const emoji = cat.score >= 0.8 ? '✅' : cat.score >= 0.6 ? '⚠️' : '❌'
      lines.push(`| ${emoji} ${cat.category} | ${(cat.score * 100).toFixed(0)}/100 |`)
    })
    lines.push('')

    if (report.harmonyReport.recommendations.length > 0) {
      lines.push('**改进建议:**')
      report.harmonyReport.recommendations.forEach(rec => {
        lines.push(`- ${rec}`)
      })
      lines.push('')
    }

    // 颜色采样摘要
    if (report.diagramSamples.length > 0) {
      lines.push('### 图表颜色采样')
      lines.push('')
      lines.push('| 图表类型 | 唯一颜色数 | 元素数 |')
      lines.push('|----------|------------|--------|')
      report.diagramSamples.forEach(sample => {
        lines.push(`| ${sample.diagramType} | ${sample.uniqueColors.length} | ${sample.summary.totalElements} |`)
      })
      lines.push('')
    }
  })

  // 总结和建议
  lines.push('---')
  lines.push('')
  lines.push('# 总结与建议')
  lines.push('')

  const failedReports = reports.filter(r => !r.passed)
  if (failedReports.length > 0) {
    lines.push('## 需要改进的主题')
    lines.push('')
    failedReports.forEach(report => {
      lines.push(`### ${report.themeName}`)
      report.issues.forEach(issue => {
        lines.push(`- ${issue}`)
      })
      lines.push('')
    })
  } else {
    lines.push('✅ 所有主题测试通过！')
  }

  return lines.join('\n')
}

/**
 * 生成 JSON 格式的报告
 */
export function generateJSONReport(reports: CompleteThemeTestReport[]): string {
  return JSON.stringify(reports, null, 2)
}

// 辅助函数
function createEmptyContrastReport(themeName: string): ThemeContrastReport {
  return {
    themeName,
    isDark: false,
    results: [],
    summary: {
      total: 0,
      passed: 0,
      failed: 0,
      criticalPassed: 0,
      criticalTotal: 0,
      aaCompliant: 0,
      aaaCompliant: 0,
    },
    failedChecks: [],
    recommendations: [],
  }
}

function createEmptyHarmonyReport(themeName: string): VisualHarmonyReport {
  return {
    themeName,
    isDark: false,
    overallScore: 0,
    categories: [],
    summary: {
      totalIssues: 0,
      criticalIssues: 0,
      warnings: 0,
    },
    recommendations: [],
  }
}

function createErrorReport(themeName: string, error: Error): CompleteThemeTestReport {
  return {
    themeName,
    timestamp: new Date().toISOString(),
    contrastReport: createEmptyContrastReport(themeName),
    harmonyReport: createEmptyHarmonyReport(themeName),
    diagramSamples: [],
    overallScore: 0,
    passed: false,
    issues: [`测试执行错误: ${error.message}`],
  }
}

/**
 * 运行测试并输出结果
 */
export function runThemeTests(config?: Partial<TestSuiteConfig>): {
  reports: CompleteThemeTestReport[]
  markdown: string
  json: string
} {
  const reports = testAllThemes(config)
  const markdown = generateCompleteReport(reports)
  const json = generateJSONReport(reports)

  return { reports, markdown, json }
}
