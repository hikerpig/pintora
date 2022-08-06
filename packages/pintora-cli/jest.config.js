const baseConfig = require('../../jest.config.base')

module.exports = {
  ...baseConfig,
  testEnvironmentOptions: {
    // Jest 30 默认使用 'soft' 模式清理全局对象，会与 jsdom/canvas 产生冲突导致堆栈溢出
    // 设置为 'off' 禁用自动清理，避免与 @antv/g 渲染库的内部状态冲突
    globalsCleanup: 'off',
  },
}
