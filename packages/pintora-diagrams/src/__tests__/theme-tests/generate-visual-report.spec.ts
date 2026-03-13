/**
 * 生成可视化 HTML 报告
 * 运行: pnpm test packages/pintora-diagrams/src/__tests__/theme-tests/generate-visual-report.spec.ts
 */

import * as fs from 'fs'
import * as path from 'path'
import { themeRegistry, diagramRegistry } from '@pintora/core'
import { DIAGRAMS } from '../../index'
import { getAllThemeColors } from './theme-color-extractor'
import { checkThemeContrast } from './contrast-checker'
import { checkVisualHarmony } from './visual-harmony-checker'
import { generateVisualReport, ThemeVisualData } from './visual-report-generator'

describe('Generate Visual HTML Report', () => {
  beforeAll(() => {
    for (const [name, diagramDef] of Object.entries(DIAGRAMS)) {
      diagramRegistry.registerDiagram(name, diagramDef)
    }
  })

  it('should generate visual HTML report', () => {
    const themeColors = getAllThemeColors()
    const themesData: ThemeVisualData[] = themeColors.map(theme => {
      const contrastReport = checkThemeContrast(theme)
      const harmonyReport = checkVisualHarmony(theme)

      return {
        themeName: theme.name,
        isDark: theme.isDark,
        contrastReport,
        harmonyReport,
        colorPalette: {
          background: [theme.background, ...theme.backgrounds],
          foreground: [theme.text],
          accent: [theme.primary, theme.secondary, theme.tertiary],
          border: theme.borders,
        },
      }
    })

    const html = generateVisualReport(themesData)

    const reportsDir = path.join(process.cwd(), 'reports')
    if (!fs.existsSync(reportsDir)) {
      fs.mkdirSync(reportsDir, { recursive: true })
    }

    const reportPath = path.join(reportsDir, 'theme-test-visual-report.html')
    fs.writeFileSync(reportPath, html)

    console.log('\n=== 可视化主题测试报告 ===')
    console.log(`生成了 ${themesData.length} 个主题的视觉报告`)
    console.log(`平均对比度通过率: ${Math.round(themesData.reduce((sum, t) => sum + (t.contrastReport.summary.passed / t.contrastReport.summary.total) * 100, 0) / themesData.length)}%`)
    console.log(`平均和谐度评分: ${Math.round(themesData.reduce((sum, t) => sum + t.harmonyReport.overallScore, 0) / themesData.length)}`)
    console.log(`\n报告已保存到: ${reportPath}`)

    expect(fs.existsSync(reportPath)).toBe(true)
  })
})

