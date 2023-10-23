import * as fs from 'fs'
import { render, PintoraConfig } from '..'

const buildSVG = async (code: string, config?: Partial<PintoraConfig>) => {
  const str = await render({
    code: code,
    pintoraConfig: config,
    mimeType: 'image/svg+xml',
    width: 1000,
    backgroundColor: '#fff',
  })
  fs.writeFileSync('example.svg', str)
}

const buildPNG = async (code: string, config?: Partial<PintoraConfig>) => {
  const buf = await render({
    code: code,
    pintoraConfig: config,
    mimeType: 'image/png',
    width: 800,
    backgroundColor: '#fdfdfd', // use some other background color
  })
  fs.writeFileSync('example.png', buf)
}

const code = `
activityDiagram
start
:render functionl called;
if (is mimeType image/svg+xml ?) then
  :renderer svg;
  :render with jsdom;
  :generate string;
else (no)
  :renderer canvas;
  :render with node-canvas;
  :generate image buffer by mimeType;
endif

:return result;

end
`

buildSVG(code)

buildPNG(code)
