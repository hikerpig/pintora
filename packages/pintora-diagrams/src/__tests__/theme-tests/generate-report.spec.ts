/**
 * 生成主题测试报告
 * 运行: pnpm test packages/pintora-diagrams/src/__tests__/theme-tests/generate-report.spec.ts
 */

import * as fs from 'fs'
import * as path from 'path'
import { runThemeTests, generateCompleteReport } from './theme-test-suite'
import { diagramRegistry } from '@pintora/core'
import { DIAGRAMS } from '../../index'

describe('Generate Theme Test Report', () => {
  beforeAll(() => {
    // 注册所有图表类型
    for (const [name, diagramDef] of Object.entries(DIAGRAMS)) {
      diagramRegistry.registerDiagram(name, diagramDef)
    }
  })

  it('should generate markdown report', () => {
    const { reports, markdown } = runThemeTests()
    
    // 确保 reports 目录存在
    const reportsDir = path.join(process.cwd(), 'reports')
    if (!fs.existsSync(reportsDir)) {
      fs.mkdirSync(reportsDir, { recursive: true })
    }
    
    // 写入报告
    const reportPath = path.join(reportsDir, 'theme-test-report.md')
    fs.writeFileSync(reportPath, markdown)
    
    console.log('\n=== 主题测试报告 ===')
    console.log(`通过: ${reports.filter(r => r.passed).length} ✅`)
    console.log(`失败: ${reports.filter(r => !r.passed).length} ❌`)
    console.log(`总计: ${reports.length}`)
    console.log(`\n报告已保存到: ${reportPath}`)
    
    expect(fs.existsSync(reportPath)).toBe(true)
  })

  it('should generate JSON report', () => {
    const { reports, json } = runThemeTests()
    
    const reportsDir = path.join(process.cwd(), 'reports')
    if (!fs.existsSync(reportsDir)) {
      fs.mkdirSync(reportsDir, { recursive: true })
    }
    
    const reportPath = path.join(reportsDir, 'theme-test-report.json')
    fs.writeFileSync(reportPath, json)
    
    console.log(`JSON 报告已保存到: ${reportPath}`)
    
    expect(fs.existsSync(reportPath)).toBe(true)
  })
})
