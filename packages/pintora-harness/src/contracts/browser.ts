export const DEFAULT_PREVIEW_BASE_URL = 'http://localhost:3001/demo/preview/'
export const DEFAULT_CAPTURE_VIEWPORT = { width: 1440, height: 960 }
export const DEFAULT_CAPTURE_ARTIFACTS = {
  screenshot: 'browser.png',
  dom: 'dom.html',
}

export type CaptureViewport = {
  width: number
  height: number
}
