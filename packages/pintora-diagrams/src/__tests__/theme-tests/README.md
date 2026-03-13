# Pintora 主题颜色自动化测试方案

这套自动化测试方案用于测试 Pintora 在不同 color theme 下图表颜色的对比度和美观度。

## 功能特性

### 1. 对比度测试
- 基于 WCAG 2.1 标准计算颜色对比度
- 检查文本与背景的对比度是否满足可读性要求
- 支持关键/重要/普通三个重要性级别的检查
- 生成详细的对比度报告

### 2. 视觉和谐度测试
- 检查颜色区分度（确保不同元素可区分）
- 检查背景层次（确保视觉深度）
- 检查色彩和谐度（色相分布）
- 检查主题一致性（深色/浅色主题特征）
- 检查饱和度平衡
- 检查色温平衡

### 3. 图表颜色采样
- 从实际渲染的图表中提取颜色
- 分析颜色使用模式
- 对比不同主题下的颜色差异

### 4. 综合测试套件
- 一键测试所有主题
- 生成 Markdown 和 JSON 格式的报告
- 可配置的测试参数

## 文件结构

```
theme-tests/
├── color-utils.ts           # 颜色工具函数（转换、对比度计算等）
├── theme-color-extractor.ts # 主题颜色提取器
├── contrast-checker.ts      # 对比度检查器
├── visual-harmony-checker.ts # 视觉和谐度检查器
├── diagram-color-sampler.ts # 图表颜色采样器
├── theme-test-suite.ts      # 综合测试套件
├── theme.spec.ts            # Jest 测试用例
├── index.ts                 # 导出所有功能
└── README.md                # 本文档
```

## 使用方法

### 运行测试

```bash
# 运行所有主题测试
pnpm test packages/pintora-diagrams/src/__tests__/theme-tests/theme.spec.ts

# 运行所有测试（包含主题测试）
pnpm test
```

### 在代码中使用

```typescript
import {
  // 获取所有主题颜色
  getAllThemeColors,
  
  // 检查单个主题对比度
  checkThemeContrast,
  
  // 检查视觉和谐度
  checkVisualHarmony,
  
  // 运行完整测试套件
  runThemeTests,
} from './theme-tests'

// 获取所有主题颜色
const themeColors = getAllThemeColors()

// 检查默认主题对比度
const defaultTheme = themeColors.find(t => t.name === 'default')
const contrastReport = checkThemeContrast(defaultTheme)
console.log(`通过率: ${contrastReport.summary.passed}/${contrastReport.summary.total}`)

// 检查视觉和谐度
const harmonyReport = checkVisualHarmony(defaultTheme)
console.log(`和谐度评分: ${harmonyReport.overallScore}`)

// 运行完整测试
const { reports, markdown, json } = runThemeTests()
// markdown: Markdown 格式的完整报告
// json: JSON 格式的完整报告
```

### 自定义测试配置

```typescript
import { runThemeTests, DEFAULT_TEST_CONFIG } from './theme-tests'

const config = {
  ...DEFAULT_TEST_CONFIG,
  themes: ['default', 'dark'],  // 只测试指定主题
  diagrams: ['sequence', 'er'], // 只测试指定图表类型
  minContrastScore: 0.85,       // 提高对比度要求
  minHarmonyScore: 0.75,        // 提高和谐度要求
}

const { reports } = runThemeTests(config)
```

## 测试内容详解

### 对比度检查

检查以下颜色组合的对比度：

1. **关键对比度** (Critical)
   - 主要文本在背景上
   - 文本在分组背景上
   - 必须满足 WCAG AA 标准 (4.5:1)

2. **重要对比度** (Important)
   - 主色/次色在背景上
   - 线条颜色在背景上
   - 笔记文本在笔记背景上
   - 必须满足 WCAG AA 大字体标准 (3:1)

3. **普通对比度** (Normal)
   - 边框颜色
   - 强调色之间的对比
   - 至少有一些可见差异 (2:1)

### 视觉和谐度检查

1. **颜色区分度** (权重 25%)
   - 强调色之间是否有足够差异
   - 线条颜色是否可区分

2. **背景层次** (权重 15%)
   - 背景颜色是否有适当的亮度层次
   - 层次之间是否有足够的差异

3. **色彩和谐度** (权重 20%)
   - 强调色的色相分布是否合理
   - 是否避免颜色过于集中

4. **主题一致性** (权重 20%)
   - 深色主题是否使用深色背景
   - 文本颜色是否与背景协调

5. **饱和度平衡** (权重 10%)
   - 整体饱和度是否适中
   - 颜色饱和度是否一致

6. **色温平衡** (权重 10%)
   - 是否有冷暖色调的平衡
   - 避免过于单一的温度感

## 扩展主题

当添加新主题时，测试会自动包含新主题。确保新主题满足以下要求：

1. 在 `themeRegistry` 中注册主题
2. 实现 `ITheme` 接口
3. 确保关键对比度检查通过
4. 视觉和谐度评分至少 0.5

## 报告解读

### 对比度报告

```
主题对比度检查报告: default

概览
- 主题类型: 浅色
- 总检查项: 20
- 通过: 18 ✅
- 失败: 2 ❌
- 关键检查: 8/8
- WCAG AA 合规: 18/20
```

### 视觉和谐度报告

```
视觉和谐度检查报告: default

总体评分: 85/100

分类评分
✅ 颜色区分度: 90/100
✅ 背景层次: 80/100
✅ 色彩和谐度: 85/100
✅ 主题一致性: 90/100
⚠️ 饱和度平衡: 75/100
✅ 色温平衡: 85/100
```

## CI/CD 集成

可以在 CI 流程中添加主题测试：

```yaml
# .github/workflows/theme-test.yml
name: Theme Color Test

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Setup Node.js
        uses: actions/setup-node@v2
        with:
          node-version: '18'
      - name: Install dependencies
        run: pnpm install
      - name: Run theme tests
        run: pnpm test packages/pintora-diagrams/src/__tests__/theme-tests/theme.spec.ts
      - name: Upload report
        uses: actions/upload-artifact@v2
        with:
          name: theme-test-report
          path: reports/theme-test-report.md
```

## 未来扩展

1. **视觉回归测试**: 使用截图对比检测主题变化
2. **色盲模拟**: 检查主题在色盲用户眼中的效果
3. **自动修复建议**: 基于测试结果自动生成颜色调整建议
4. **性能优化**: 缓存颜色计算结果以提高测试速度
