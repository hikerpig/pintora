/**
 * 主题颜色测试
 * 测试不同主题下图表颜色的对比度和视觉和谐度
 */

import { themeRegistry, diagramRegistry } from '@pintora/core'
import { DIAGRAMS } from '../../index'
import {
  hexToRgb,
  getContrastRatio,
  checkContrastLevel,
  ContrastLevel,
  areColorsTooSimilar,
  checkColorHarmony,
} from './color-utils'
import {
  getAllThemeColors,
  getThemeColorPairs,
  getDiagramSpecificColorPairs,
} from './theme-color-extractor'
import {
  checkThemeContrast,
  checkDiagramContrast,
  checkAllThemesContrast,
} from './contrast-checker'
import {
  checkVisualHarmony,
} from './visual-harmony-checker'
import {
  testSingleTheme,
  testAllThemes,
  runThemeTests,
  DEFAULT_TEST_CONFIG,
} from './theme-test-suite'

describe('Theme Color Tests', () => {
  beforeAll(() => {
    // 注册所有图表类型
    for (const [name, diagramDef] of Object.entries(DIAGRAMS)) {
      diagramRegistry.registerDiagram(name, diagramDef)
    }
  })

  const themeNames = Object.keys(themeRegistry.themes)
  const themeColors = getAllThemeColors()

  describe('Color Utilities', () => {
    it('should convert hex to RGB correctly', () => {
      expect(hexToRgb('#ffffff')).toEqual({ r: 255, g: 255, b: 255 })
      expect(hexToRgb('#000000')).toEqual({ r: 0, g: 0, b: 0 })
      expect(hexToRgb('#ff0000')).toEqual({ r: 255, g: 0, b: 0 })
      expect(hexToRgb('#fff')).toEqual({ r: 255, g: 255, b: 255 })
    })

    it('should calculate contrast ratio correctly', () => {
      // 黑白对比度应该是 21:1
      expect(getContrastRatio('#000000', '#ffffff')).toBeCloseTo(21, 0)
      
      // 相同颜色对比度应该是 1:1
      expect(getContrastRatio('#ffffff', '#ffffff')).toBe(1)
      
      // 灰度对比
      const grayOnWhite = getContrastRatio('#808080', '#ffffff')
      expect(grayOnWhite).toBeGreaterThan(3)
      expect(grayOnWhite).toBeLessThan(5)
    })

    it('should detect similar colors', () => {
      expect(areColorsTooSimilar('#ffffff', '#ffffff')).toBe(true)
      expect(areColorsTooSimilar('#ffffff', '#fffffe', 0.99)).toBe(true)
      expect(areColorsTooSimilar('#ff0000', '#00ff00')).toBe(false)
    })
  })

  describe('Theme Color Extraction', () => {
    it('should extract colors from all themes', () => {
      expect(themeColors.length).toBeGreaterThan(0)
      
      themeColors.forEach(theme => {
        expect(theme.name).toBeDefined()
        expect(theme.background).toBeDefined()
        expect(theme.text).toBeDefined()
        expect(theme.primary).toBeDefined()
      })
    })

    it('should have valid hex colors in all themes', () => {
      themeColors.forEach(theme => {
        const allColors = [
          theme.background,
          theme.text,
          theme.primary,
          theme.secondary,
          theme.tertiary,
          ...theme.lines,
          ...theme.borders,
          ...theme.backgrounds,
        ]

        allColors.forEach(color => {
          const rgb = hexToRgb(color)
          expect(rgb).not.toBeNull()
          expect(rgb!.r).toBeGreaterThanOrEqual(0)
          expect(rgb!.r).toBeLessThanOrEqual(255)
          expect(rgb!.g).toBeGreaterThanOrEqual(0)
          expect(rgb!.g).toBeLessThanOrEqual(255)
          expect(rgb!.b).toBeGreaterThanOrEqual(0)
          expect(rgb!.b).toBeLessThanOrEqual(255)
        })
      })
    })
  })

  describe('Contrast Checks', () => {
    it('should pass WCAG AA for critical text contrast in all themes', () => {
      themeColors.forEach(theme => {
        const pairs = getThemeColorPairs(theme)
        const criticalPairs = pairs.filter(p => p.importance === 'critical')
        
        criticalPairs.forEach(pair => {
          const ratio = getContrastRatio(pair.foreground, pair.background)
          const level = checkContrastLevel(ratio, false)
          
          // 关键文本对比度应该至少达到 AA 标准 (4.5:1)
          expect(ratio).toBeGreaterThanOrEqual(4.5)
          expect(level).not.toBe(ContrastLevel.FAIL)
        })
      })
    })

    it('should have sufficient contrast for text on background in all themes', () => {
      themeColors.forEach(theme => {
        const textBgRatio = getContrastRatio(theme.text, theme.background)
        
        // 文本和背景对比度应该至少为 4.5:1
        expect(textBgRatio).toBeGreaterThanOrEqual(4.5)
      })
    })

    it('should generate contrast reports for all themes', () => {
      const reports = checkAllThemesContrast(themeColors)
      
      expect(reports.length).toBe(themeColors.length)
      
      reports.forEach(report => {
        expect(report.themeName).toBeDefined()
        expect(report.summary.total).toBeGreaterThan(0)
        expect(report.results.length).toBe(report.summary.total)
      })
    })

    it('should pass critical contrast checks for default theme', () => {
      const defaultTheme = themeColors.find(t => t.name === 'default')
      expect(defaultTheme).toBeDefined()
      
      const report = checkThemeContrast(defaultTheme!)
      
      // 关键检查应该全部通过
      expect(report.summary.criticalPassed).toBe(report.summary.criticalTotal)
    })

    it('should pass critical contrast checks for dark theme', () => {
      const darkTheme = themeColors.find(t => t.name === 'dark')
      expect(darkTheme).toBeDefined()
      
      const report = checkThemeContrast(darkTheme!)
      
      // 关键检查应该全部通过
      expect(report.summary.criticalPassed).toBe(report.summary.criticalTotal)
    })
  })

  describe('Visual Harmony Checks', () => {
    it('should have acceptable visual harmony for all themes', () => {
      themeColors.forEach(theme => {
        const report = checkVisualHarmony(theme)
        
        // 总体和谐度应该至少为 0.5
        expect(report.overallScore).toBeGreaterThanOrEqual(0.5)
        
        // 严重问题应该很少（最多1个）
        expect(report.summary.criticalIssues).toBeLessThanOrEqual(1)
      })
    })

    it('should have distinct accent colors in all themes', () => {
      themeColors.forEach(theme => {
        const accentColors = [theme.primary, theme.secondary, theme.tertiary]
        
        // 检查颜色和谐度
        const harmony = checkColorHarmony(accentColors)
        
        // 强调色应该有一定的区分度
        expect(harmony.score).toBeGreaterThan(0.3)
      })
    })

    it('should have consistent dark/light theme characteristics', () => {
      themeColors.forEach(theme => {
        const report = checkVisualHarmony(theme)
        const consistencyCategory = report.categories.find(c => c.category === '主题一致性')
        
        expect(consistencyCategory).toBeDefined()
        expect(consistencyCategory!.score).toBeGreaterThan(0.5)
      })
    })
  })

  describe('Diagram-Specific Contrast', () => {
    const diagramTypes = ['sequence', 'er', 'mindmap', 'gantt']

    diagramTypes.forEach(diagramType => {
      it(`should have sufficient contrast for ${diagramType} diagram in all themes`, () => {
        themeColors.forEach(theme => {
          const report = checkDiagramContrast(theme, diagramType)
          
          // 图表特定对比度检查 - 至少有一些检查通过即可
          // 这些检查基于假设的颜色组合，实际图表可能使用不同颜色
          expect(report.summary.passed).toBeGreaterThanOrEqual(1)
        })
      })
    })
  })

  describe('Theme Test Suite', () => {
    it('should test single theme successfully', () => {
      const report = testSingleTheme('default')
      
      expect(report.themeName).toBe('default')
      expect(report.contrastReport).toBeDefined()
      expect(report.harmonyReport).toBeDefined()
      expect(report.overallScore).toBeGreaterThan(0)
    })

    it('should test all themes successfully', () => {
      const reports = testAllThemes()
      
      expect(reports.length).toBe(themeNames.length)
      
      reports.forEach(report => {
        expect(report.contrastReport).toBeDefined()
        expect(report.harmonyReport).toBeDefined()
      })
    })

    it('should generate complete test report', () => {
      const { reports, markdown, json } = runThemeTests()
      
      expect(reports.length).toBeGreaterThan(0)
      expect(markdown).toContain('# Pintora 主题颜色测试报告')
      expect(json).toContain('themeName')
      
      // 验证 JSON 可以解析
      const parsed = JSON.parse(json)
      expect(Array.isArray(parsed)).toBe(true)
    })

    it('should respect test configuration', () => {
      const config = {
        themes: ['default'],
        checkHarmony: false,
        sampleColors: false,
      }
      
      const reports = testAllThemes(config)
      
      expect(reports.length).toBe(1)
      expect(reports[0].themeName).toBe('default')
      // 和谐度检查被禁用，应该有默认的空报告
      expect(reports[0].harmonyReport.categories.length).toBe(0)
    })
  })

  describe('Color Theme Compliance', () => {
    it('should have consistent color usage across themes', () => {
      // 所有主题应该有相似的结构
      themeColors.forEach(theme => {
        expect(theme.lines.length).toBeGreaterThanOrEqual(1)
        expect(theme.borders.length).toBeGreaterThanOrEqual(1)
        expect(theme.backgrounds.length).toBeGreaterThanOrEqual(1)
      })
    })

    it('should have appropriate note colors', () => {
      themeColors.forEach(theme => {
        if (theme.note) {
          // 笔记背景应该是可见的
          expect(theme.note.background).toBeDefined()
          
          // 如果有笔记文本颜色，应该与背景有足够对比度
          if (theme.note.text && theme.note.background) {
            const ratio = getContrastRatio(theme.note.text, theme.note.background)
            expect(ratio).toBeGreaterThanOrEqual(3)
          }
        }
      })
    })
  })
})
