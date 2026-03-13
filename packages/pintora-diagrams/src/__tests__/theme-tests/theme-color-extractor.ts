/**
 * 主题颜色提取器
 * 从 Pintora 主题中提取所有相关颜色
 */

import { ITheme, themeRegistry } from '@pintora/core'

export interface ThemeColorSet {
  name: string
  isDark: boolean
  background: string
  text: string
  primary: string
  secondary: string
  tertiary: string
  lines: string[]
  borders: string[]
  backgrounds: string[]
  textColors: string[]
  note?: {
    text?: string
    background?: string
  }
  // 图表特定颜色
  diagramColors?: {
    entityBackground?: string
    entityBorder?: string
    relationLine?: string
    activationBackground?: string
    lifelineColor?: string
    // 更多图表特定颜色...
  }
}

/**
 * 从主题中提取所有颜色
 */
export function extractThemeColors(themeName: string, theme: ITheme): ThemeColorSet {
  const colors: ThemeColorSet = {
    name: themeName,
    isDark: theme.isDark || false,
    background: theme.canvasBackground || '#ffffff',
    text: theme.textColor,
    primary: theme.primaryColor,
    secondary: theme.secondaryColor,
    tertiary: theme.teritaryColor,
    lines: [theme.primaryLineColor, theme.secondaryLineColor].filter(Boolean),
    borders: [theme.primaryBorderColor, theme.secondaryBorderColor].filter(Boolean),
    backgrounds: [theme.groupBackground, theme.background1, theme.lightestBackground].filter(Boolean),
    textColors: [theme.textColor, theme.primaryTextColor, theme.secondaryTextColor, theme.teritaryTextColor].filter(Boolean),
  }

  if (theme.noteBackground || theme.noteTextColor) {
    colors.note = {
      text: theme.noteTextColor,
      background: theme.noteBackground,
    }
  }

  return colors
}

/**
 * 获取所有可用主题的颜色
 */
export function getAllThemeColors(): ThemeColorSet[] {
  const themes = themeRegistry.themes
  return Object.entries(themes).map(([name, theme]) => extractThemeColors(name, theme))
}

/**
 * 获取主题颜色组合（前景色+背景色）
 * 用于测试对比度
 */
export interface ColorPair {
  foreground: string
  background: string
  description: string
  importance: 'critical' | 'important' | 'normal'
}

export function getThemeColorPairs(themeColors: ThemeColorSet): ColorPair[] {
  const pairs: ColorPair[] = []

  // 关键对比度组合 - 文本和背景
  pairs.push(
    {
      foreground: themeColors.text,
      background: themeColors.background,
      description: '主要文本在背景上',
      importance: 'critical',
    },
    {
      foreground: themeColors.primary,
      background: themeColors.background,
      description: '主色在背景上',
      importance: 'important',
    },
    {
      foreground: themeColors.secondary,
      background: themeColors.background,
      description: '次色在背景上',
      importance: 'important',
    }
  )

  // 文本颜色在 groupBackground 上
  if (themeColors.backgrounds[0]) {
    pairs.push({
      foreground: themeColors.text,
      background: themeColors.backgrounds[0],
      description: '文本在分组背景上',
      importance: 'critical',
    })
  }

  // 线条颜色在背景上
  themeColors.lines.forEach((line, index) => {
    pairs.push({
      foreground: line,
      background: themeColors.background,
      description: `线条颜色 ${index + 1} 在背景上`,
      importance: 'important',
    })
  })

  // 边框颜色在背景上
  themeColors.borders.forEach((border, index) => {
    pairs.push({
      foreground: border,
      background: themeColors.background,
      description: `边框颜色 ${index + 1} 在背景上`,
      importance: 'normal',
    })
  })

  // 笔记颜色组合
  if (themeColors.note) {
    if (themeColors.note.text && themeColors.note.background) {
      pairs.push({
        foreground: themeColors.note.text,
        background: themeColors.note.background,
        description: '笔记文本在笔记背景上',
        importance: 'important',
      })
    }
    if (themeColors.note.background) {
      pairs.push({
        foreground: themeColors.text,
        background: themeColors.note.background,
        description: '普通文本在笔记背景上',
        importance: 'normal',
      })
    }
  }

  // 颜色之间的对比度（用于区分不同元素）
  const accentColors = [themeColors.primary, themeColors.secondary, themeColors.tertiary]
  for (let i = 0; i < accentColors.length; i++) {
    for (let j = i + 1; j < accentColors.length; j++) {
      pairs.push({
        foreground: accentColors[i],
        background: accentColors[j],
        description: `强调色 ${i + 1} 在强调色 ${j + 1} 上`,
        importance: 'normal',
      })
    }
  }

  return pairs
}

/**
 * 获取图表特定的颜色组合
 * 针对不同图表类型的颜色需求
 */
export function getDiagramSpecificColorPairs(themeColors: ThemeColorSet, diagramType: string): ColorPair[] {
  const pairs: ColorPair[] = []
  const basePairs = getThemeColorPairs(themeColors)

  switch (diagramType) {
    case 'sequence':
      // 序列图特定组合
      pairs.push(
        {
          foreground: themeColors.text,
          background: themeColors.backgrounds[1] || themeColors.background,
          description: '激活条文本',
          importance: 'critical',
        },
        {
          foreground: themeColors.lines[0],
          background: themeColors.background,
          description: '生命线',
          importance: 'important',
        }
      )
      break

    case 'er':
      // ER 图特定组合
      pairs.push(
        {
          foreground: themeColors.textColors[2] || themeColors.text,
          background: themeColors.backgrounds[2] || themeColors.background,
          description: 'ER 实体属性文本',
          importance: 'critical',
        },
        {
          foreground: themeColors.primary,
          background: themeColors.backgrounds[0] || themeColors.background,
          description: 'ER 实体标题',
          importance: 'important',
        }
      )
      break

    case 'mindmap':
      // 思维导图特定组合
      pairs.push(
        {
          foreground: themeColors.text,
          background: themeColors.primary,
          description: '思维导图节点文本',
          importance: 'critical',
        },
        {
          foreground: themeColors.text,
          background: themeColors.secondary,
          description: '思维导图次级节点',
          importance: 'important',
        }
      )
      break

    case 'gantt':
      // 甘特图特定组合
      pairs.push(
        {
          foreground: themeColors.text,
          background: themeColors.primary,
          description: '甘特图任务条文本',
          importance: 'critical',
        },
        {
          foreground: themeColors.textColors[1] || themeColors.text,
          background: themeColors.backgrounds[1] || themeColors.background,
          description: '甘特图时间轴文本',
          importance: 'important',
        }
      )
      break
  }

  return [...basePairs, ...pairs]
}

/**
 * 颜色使用统计
 */
export interface ColorUsage {
  color: string
  usageCount: number
  usedIn: string[]
}

export function analyzeColorUsage(themeColors: ThemeColorSet): ColorUsage[] {
  const usageMap = new Map<string, { count: number; uses: Set<string> }>()

  const addUsage = (color: string | undefined, use: string) => {
    if (!color) return
    const existing = usageMap.get(color) || { count: 0, uses: new Set() }
    existing.count++
    existing.uses.add(use)
    usageMap.set(color, existing)
  }

  // 统计各种颜色的使用
  addUsage(themeColors.background, 'canvasBackground')
  addUsage(themeColors.text, 'textColor')
  addUsage(themeColors.primary, 'primaryColor')
  addUsage(themeColors.secondary, 'secondaryColor')
  addUsage(themeColors.tertiary, 'teritaryColor')
  
  themeColors.lines.forEach((c, i) => addUsage(c, `lineColor-${i}`))
  themeColors.borders.forEach((c, i) => addUsage(c, `borderColor-${i}`))
  themeColors.backgrounds.forEach((c, i) => addUsage(c, `background-${i}`))
  themeColors.textColors.forEach((c, i) => addUsage(c, `textColor-${i}`))
  
  if (themeColors.note) {
    addUsage(themeColors.note.text, 'noteTextColor')
    addUsage(themeColors.note.background, 'noteBackground')
  }

  return Array.from(usageMap.entries()).map(([color, data]) => ({
    color,
    usageCount: data.count,
    usedIn: Array.from(data.uses),
  })).sort((a, b) => b.usageCount - a.usageCount)
}
