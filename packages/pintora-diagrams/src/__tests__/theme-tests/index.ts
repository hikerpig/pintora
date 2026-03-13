/**
 * 主题测试工具包
 * 导出所有主题测试相关的功能
 */

// 颜色工具
export {
  hexToRgb,
  rgbToHex,
  rgbToHsl,
  getRelativeLuminance,
  getContrastRatio,
  checkContrastLevel,
  ContrastLevel,
  getContrastSuggestion,
  isDarkColor,
  getColorSimilarity,
  areColorsTooSimilar,
  generateColorVariants,
  checkColorHarmony,
  type RGBColor,
  type HSLColor,
} from './color-utils'

// 主题颜色提取
export {
  extractThemeColors,
  getAllThemeColors,
  getThemeColorPairs,
  getDiagramSpecificColorPairs,
  analyzeColorUsage,
  type ThemeColorSet,
  type ColorPair,
  type ColorUsage,
} from './theme-color-extractor'

// 对比度检查
export {
  checkColorPair,
  checkThemeContrast,
  checkDiagramContrast,
  checkThemeContrastWithConfig,
  generateContrastReportText,
  checkAllThemesContrast,
  findWorstContrastPairs,
  findBestContrastPairs,
  type ContrastCheckResult,
  type ThemeContrastReport,
  type ContrastCheckConfig,
  DEFAULT_CONTRAST_CONFIG,
} from './contrast-checker'

// 视觉和谐度检查
export {
  checkVisualHarmony,
  generateHarmonyReportText,
  compareThemeHarmony,
  type HarmonyCheckResult,
  type VisualHarmonyReport,
} from './visual-harmony-checker'

// 图表颜色采样
export {
  extractColorsFromGraphicsIR,
  sampleDiagramColors,
  sampleMultipleDiagrams,
  compareDiagramColorsAcrossThemes,
  analyzeColorUsage as analyzeSampledColorUsage,
  checkColorThemeCompliance,
  generateColorSamplingReport,
  type ColorSample,
  type DiagramColorSamples,
  type DiagramExample,
  type ColorUsagePattern,
  type ColorThemeCompliance,
} from './diagram-color-sampler'

// 测试套件
export {
  testSingleTheme,
  testAllThemes,
  generateCompleteReport,
  generateJSONReport,
  runThemeTests,
  type CompleteThemeTestReport,
  type TestSuiteConfig,
  DEFAULT_TEST_CONFIG,
} from './theme-test-suite'
