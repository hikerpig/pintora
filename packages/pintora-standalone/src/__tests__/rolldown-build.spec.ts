import * as fs from 'fs'
import * as path from 'path'

describe('rolldown build output', () => {
  const libDir = path.join(__dirname, '../../lib')
  const typesDir = path.join(__dirname, '../../types')
  const dtsFile = path.join(typesDir, 'index.d.ts')

  describe('esm build', () => {
    const esmFile = path.join(libDir, 'pintora-standalone.esm.mjs')

    it('should generate esm file', () => {
      expect(fs.existsSync(esmFile)).toBe(true)
    })

    it('should have valid content', () => {
      const content = fs.readFileSync(esmFile, 'utf-8')
      // Should be valid JavaScript
      expect(content.length).toBeGreaterThan(0)
      // Should have exports
      expect(content).toContain('export')
    })

    it('should include pintoraStandalone export', () => {
      const content = fs.readFileSync(esmFile, 'utf-8')
      expect(content).toContain('pintoraStandalone')
    })
  })

  describe('umd build', () => {
    const umdFile = path.join(libDir, 'pintora-standalone.umd.js')

    it('should generate umd file', () => {
      expect(fs.existsSync(umdFile)).toBe(true)
    })

    it('should have valid content', () => {
      const content = fs.readFileSync(umdFile, 'utf-8')
      // Should be valid JavaScript
      expect(content.length).toBeGreaterThan(0)
      // UMD should have factory function
      expect(content).toContain('function')
    })

    it('should expose pintora as global', () => {
      const content = fs.readFileSync(umdFile, 'utf-8')
      // UMD should define global variable
      expect(content).toMatch(/globalThis\.pintora|global\.pintora/)
    })

    it('should include pintoraStandalone', () => {
      const content = fs.readFileSync(umdFile, 'utf-8')
      expect(content).toContain('pintoraStandalone')
    })
  })

  describe('type declaration build', () => {
    it('should generate package entry declaration file', () => {
      expect(fs.existsSync(dtsFile)).toBe(true)
    })

    it('should include standalone exports', () => {
      const content = fs.readFileSync(dtsFile, 'utf-8')
      expect(content).toContain('PintoraStandalone')
      expect(content).toContain('pintoraStandalone')
      expect(content).toContain('export default pintoraStandalone')
    })
  })
})
