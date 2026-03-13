#!/usr/bin/env ts-node
/**
 * 主题颜色测试 CLI 脚本
 * 运行主题颜色测试并生成报告
 * 
 * 使用方法:
 *   npx ts-node run-tests.ts [options]
 * 
 * 选项:
 *   --theme <name>    只测试指定主题
 *   --format <type>   输出格式: markdown, json (默认: markdown)
 *   --output <path>   输出文件路径
 *   --help            显示帮助
 */

import { runThemeTests, testSingleTheme, generateCompleteReport, generateJSONReport } from './theme-test-suite'
import { themeRegistry } from '@pintora/core'
import * as fs from 'fs'
import * as path from 'path'

interface CliOptions {
  theme?: string
  format: 'markdown' | 'json'
  output?: string
  help: boolean
}

function parseArgs(): CliOptions {
  const args = process.argv.slice(2)
  const options: CliOptions = {
    format: 'markdown',
    help: false,
  }

  for (let i = 0; i < args.length; i++) {
    const arg = args[i]
    
    switch (arg) {
      case '--theme':
        options.theme = args[++i]
        break
      case '--format':
        const format = args[++i] as 'markdown' | 'json'
        if (format === 'markdown' || format === 'json') {
          options.format = format
        } else {
          console.error(`Unknown format: ${format}`)
          process.exit(1)
        }
        break
      case '--output':
        options.output = args[++i]
        break
      case '--help':
      case '-h':
        options.help = true
        break
      default:
        console.error(`Unknown option: ${arg}`)
        process.exit(1)
    }
  }

  return options
}

function showHelp() {
  console.log(`
主题颜色测试 CLI

使用方法:
  npx ts-node run-tests.ts [options]

选项:
  --theme <name>    只测试指定主题 (可用主题: ${Object.keys(themeRegistry.themes).join(', ')})
  --format <type>   输出格式: markdown, json (默认: markdown)
  --output <path>   输出文件路径 (默认: 输出到控制台)
  --help, -h        显示帮助

示例:
  npx ts-node run-tests.ts
  npx ts-node run-tests.ts --theme default
  npx ts-node run-tests.ts --format json --output report.json
`)
}

function main() {
  const options = parseArgs()

  if (options.help) {
    showHelp()
    process.exit(0)
  }

  console.log('🎨 Pintora 主题颜色测试\n')

  let output: string

  if (options.theme) {
    // 测试单个主题
    console.log(`正在测试主题: ${options.theme}\n`)
    
    const report = testSingleTheme(options.theme)
    
    console.log(`主题: ${report.themeName}`)
    console.log(`总体评分: ${(report.overallScore * 100).toFixed(0)}/100`)
    console.log(`状态: ${report.passed ? '✅ 通过' : '❌ 失败'}`)
    
    if (report.issues.length > 0) {
      console.log('\n问题:')
      report.issues.forEach(issue => console.log(`  - ${issue}`))
    }
    
    console.log('\n对比度检查:')
    console.log(`  通过: ${report.contrastReport.summary.passed}/${report.contrastReport.summary.total}`)
    console.log(`  关键检查: ${report.contrastReport.summary.criticalPassed}/${report.contrastReport.summary.criticalTotal}`)
    
    console.log('\n视觉和谐度:')
    console.log(`  评分: ${(report.harmonyReport.overallScore * 100).toFixed(0)}/100`)
    
    output = options.format === 'json' 
      ? JSON.stringify(report, null, 2)
      : generateCompleteReport([report])
  } else {
    // 测试所有主题
    console.log(`正在测试所有主题 (${Object.keys(themeRegistry.themes).length} 个)\n`)
    
    const { reports, markdown, json } = runThemeTests()
    
    const passedCount = reports.filter(r => r.passed).length
    const failedCount = reports.length - passedCount
    
    console.log('测试完成!')
    console.log(`\n汇总:`)
    console.log(`  通过: ${passedCount} ✅`)
    console.log(`  失败: ${failedCount} ❌`)
    console.log(`  总计: ${reports.length}`)
    
    output = options.format === 'json' ? json : markdown
  }

  // 输出结果
  if (options.output) {
    fs.writeFileSync(options.output, output)
    console.log(`\n报告已保存到: ${path.resolve(options.output)}`)
  } else {
    console.log('\n--- 详细报告 ---\n')
    console.log(output)
  }

  process.exit(0)
}

main()
