/**
 * 可视化主题测试报告生成器
 */

import { ThemeContrastReport } from './contrast-checker'
import { VisualHarmonyReport } from './visual-harmony-checker'

export interface ThemeVisualData {
  themeName: string
  isDark: boolean
  contrastReport: ThemeContrastReport
  harmonyReport: VisualHarmonyReport
  colorPalette: {
    background: string[]
    foreground: string[]
    accent: string[]
    border: string[]
  }
}

export function generateVisualReport(themesData: ThemeVisualData[]): string {
  const styles = `
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; background: #f5f5f5; }
    .container { max-width: 1200px; margin: 0 auto; padding: 20px; }
    header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 12px; margin-bottom: 20px; text-align: center; }
    .theme-card { background: white; border-radius: 12px; padding: 20px; margin-bottom: 20px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
    .theme-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; }
    .badge { padding: 4px 12px; border-radius: 12px; font-size: 0.8rem; }
    .badge-dark { background: #333; color: white; }
    .badge-light { background: #e0e0e0; color: #333; }
    .scores { display: flex; gap: 15px; margin-bottom: 15px; }
    .score-box { text-align: center; padding: 10px 20px; background: #f8f9fa; border-radius: 8px; }
    .score-value { font-size: 1.5rem; font-weight: bold; }
    .score-value.good { color: #28a745; }
    .score-value.warning { color: #ffc107; }
    .score-value.bad { color: #dc3545; }
    .color-palette { margin-top: 15px; }
    .color-group { display: flex; gap: 8px; margin-bottom: 10px; align-items: center; flex-wrap: wrap; }
    .color-block { width: 40px; height: 40px; border-radius: 6px; border: 1px solid #ddd; }
    .failed-checks { margin-top: 15px; padding: 10px; background: #fff3cd; border-radius: 8px; }
    .failed-item { margin-bottom: 8px; padding: 8px; background: white; border-radius: 4px; font-size: 0.9rem; }
  `

  const themeCards = themesData.map(theme => {
    const passRate = Math.round((theme.contrastReport.summary.passed / theme.contrastReport.summary.total) * 100)
    const harmonyScore = Math.round(theme.harmonyReport.overallScore)
    const failed = theme.contrastReport.failedChecks.slice(0, 3)

    return `
      <div class="theme-card">
        <div class="theme-header">
          <h3>${theme.themeName}</h3>
          <span class="badge ${theme.isDark ? 'badge-dark' : 'badge-light'}">${theme.isDark ? '深色' : '浅色'}</span>
        </div>
        <div class="scores">
          <div class="score-box">
            <div class="score-value ${passRate >= 80 ? 'good' : passRate >= 60 ? 'warning' : 'bad'}">${passRate}%</div>
            <div>对比度</div>
          </div>
          <div class="score-box">
            <div class="score-value ${harmonyScore >= 80 ? 'good' : harmonyScore >= 60 ? 'warning' : 'bad'}">${harmonyScore}</div>
            <div>和谐度</div>
          </div>
        </div>
        <div class="color-palette">
          <div class="color-group">
            <span>背景:</span>
            ${theme.colorPalette.background.map(c => `<div class="color-block" style="background:${c}" title="${c}"></div>`).join('')}
          </div>
          <div class="color-group">
            <span>强调:</span>
            ${theme.colorPalette.accent.map(c => `<div class="color-block" style="background:${c}" title="${c}"></div>`).join('')}
          </div>
        </div>
        ${failed.length > 0 ? `
        <div class="failed-checks">
          <strong>失败的对比度检查 (${theme.contrastReport.failedChecks.length}):</strong>
          ${failed.map(f => `
            <div class="failed-item">
              ${f.description}: ${f.ratio.toFixed(2)}:1 (需要 ${f.importance === 'critical' ? '4.5' : f.importance === 'important' ? '3' : '2'})
            </div>
          `).join('')}
          ${theme.contrastReport.failedChecks.length > 3 ? `<div style="margin-top: 8px; font-style: italic;">... 还有 ${theme.contrastReport.failedChecks.length - 3} 个</div>` : ''}
        </div>
        ` : ''}
      </div>
    `
  }).join('')

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Pintora 主题颜色可视化测试报告</title>
  <style>${styles}</style>
</head>
<body>
  <div class="container">
    <header>
      <h1>Pintora 主题颜色可视化测试报告</h1>
      <p>生成时间: ${new Date().toLocaleString('zh-CN')}</p>
      <p>共测试 ${themesData.length} 个主题</p>
    </header>
    ${themeCards}
  </div>
</body>
</html>`
}
