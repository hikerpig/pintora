import * as fs from 'fs'
import { pintoraStandalone } from '@pintora/standalone'
import { JSDOM } from 'jsdom'
import { implForWrapper } from 'jsdom/lib/jsdom/living/generated/utils'
import { Canvas } from 'canvas'

const sequenceExample = `sequenceDiagram
  autonumber
  User->>+Pintora: render this
  activate Pintora
  loop Check input
    Pintora-->>Pintora: Has input changed?
  end
  Pintora-->>User: your figure here
  deactivate Pintora
  Note over User,Pintora: Note over
  Note right of User: Note aside actor
`

const dom = new JSDOM('<!DOCTYPE html><body></body>')
const document = dom.window.document
const container = document.createElement('div')
container.id = 'pintora-container'

// setup the env for renderer
global.window = dom.window as any
global.document = document

;(dom.window as any).devicePixelRatio = 2

// test
pintoraStandalone.renderTo(sequenceExample, {
  container,
  renderer: 'canvas',
  // enhanceGraphicIR(ir) {
  //   if (!ir.bgColor) ir.bgColor = '#fff'
  //   return ir
  // },
  onRender(renderer) {
    setTimeout(() => {
      saveCanvas(renderer.getRootElement() as HTMLCanvasElement)
      process.exit(0)
    }, 300)
  },
  onError(e) {
    console.error('onError', e)
  },
})

function saveCanvas(canvas: HTMLCanvasElement) {
  // currently jsdom only support node-canvas,
  // and this is it's not-so-stable method for getting the underlying node-canvas instance
  const wrapper = implForWrapper(canvas)
  const nodeCanvas: Canvas = wrapper._canvas
  const context = nodeCanvas.getContext('2d')
  context.quality = 'best'
  context.patternQuality = 'best'
  const buf = nodeCanvas.toBuffer('image/png')
  fs.writeFileSync('./output.png', buf)
}