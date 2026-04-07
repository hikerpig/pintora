import * as fs from 'node:fs'
import * as path from 'node:path'
import { chromium, type Page } from 'playwright'
import { CaptureViewport, DEFAULT_CAPTURE_ARTIFACTS, DEFAULT_CAPTURE_VIEWPORT } from '../contracts/browser'

const STABILITY_POLL_COUNT = 5
const STABILITY_POLL_INTERVAL_MS = 50

export async function waitForStablePreview(page: Page) {
  await page.waitForSelector('.preview')
  await page.evaluate(async () => {
    await document.fonts.ready
  })
  await page.waitForSelector('.preview svg')

  const locator = page.locator('.preview')
  let lastBox: { width: number; height: number } | null = null
  for (let i = 0; i < STABILITY_POLL_COUNT; i++) {
    const box = await locator.boundingBox()
    if (box && lastBox && box.width === lastBox.width && box.height === lastBox.height) {
      return
    }
    lastBox = box ? { width: box.width, height: box.height } : null
    await page.waitForTimeout(STABILITY_POLL_INTERVAL_MS)
  }
}

export async function capturePreviewArtifacts(opts: {
  previewUrl: string
  outDir: string
  viewport?: CaptureViewport
}) {
  const viewport = opts.viewport || DEFAULT_CAPTURE_VIEWPORT
  const browser = await chromium.launch({ headless: true })
  const page = await browser.newPage({ viewport, deviceScaleFactor: 1 })

  try {
    await page.goto(opts.previewUrl, { waitUntil: 'domcontentloaded' })
    await waitForStablePreview(page)

    const screenshotPath = path.join(opts.outDir, DEFAULT_CAPTURE_ARTIFACTS.screenshot)
    const domPath = path.join(opts.outDir, DEFAULT_CAPTURE_ARTIFACTS.dom)
    fs.mkdirSync(opts.outDir, { recursive: true })

    await page.locator('.preview').screenshot({ path: screenshotPath })
    fs.writeFileSync(domPath, await page.content())

    return { screenshotPath, domPath }
  } finally {
    await page.close()
    await browser.close()
  }
}
