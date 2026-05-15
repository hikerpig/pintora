import { buildHarnessSummary } from '../summary/summary-rules'

type MetricViewBox = {
  x: number
  y: number
  width: number
  height: number
}

function makeMetrics(viewBox: MetricViewBox | null, rootChildCount = 1) {
  return {
    viewBox,
    rootChildCount,
  }
}

const baseArgs = {
  run_id: 'run-1',
  case_id: 'case-1',
  diagram_type: 'sequence',
}

describe('buildHarnessSummary', () => {
  it('maps ok runs to done with conservative scores', () => {
    const summary = buildHarnessSummary({
      ...baseArgs,
      artifacts: {
        svg: 'render.svg',
        png: 'render.png',
        browser_png: null,
        dom_html: null,
        metrics: 'metrics.json',
        findings: 'findings.json',
      },
      metrics: makeMetrics({ x: 0, y: 0, width: 100, height: 80 }),
      findings: [],
    })

    expect(summary.status).toBe('ok')
    expect(summary.next_action).toBe('done')
    expect(summary.scores).toEqual({
      legibility: 3,
      structural_clarity: 3,
      spatial_balance: 3,
      visual_taste: null,
    })
  })

  it('maps suspicious runs without browser output to capture_browser', () => {
    const summary = buildHarnessSummary({
      ...baseArgs,
      artifacts: {
        svg: 'render.svg',
        png: null,
        browser_png: null,
        dom_html: null,
        metrics: 'metrics.json',
        findings: 'findings.json',
      },
      metrics: makeMetrics({ x: 0, y: 0, width: 100, height: 80 }),
      findings: [{ message: 'first finding' }],
    })

    expect(summary.status).toBe('suspicious')
    expect(summary.next_action).toBe('capture_browser')
    expect(summary.scores).toEqual({
      legibility: 2,
      structural_clarity: 2,
      spatial_balance: null,
      visual_taste: null,
    })
  })

  it('maps suspicious runs with browser output to human_review_or_visual_judge', () => {
    const summary = buildHarnessSummary({
      ...baseArgs,
      artifacts: {
        svg: 'render.svg',
        png: null,
        browser_png: 'browser.png',
        dom_html: 'dom.html',
        metrics: 'metrics.json',
        findings: 'findings.json',
      },
      metrics: makeMetrics({ x: 0, y: 0, width: 100, height: 80 }),
      findings: [{ message: 'first finding' }],
    })

    expect(summary.status).toBe('suspicious')
    expect(summary.next_action).toBe('human_review_or_visual_judge')
    expect(summary.judge.required).toBe(true)
    expect(summary.judge.inputs.artifacts).toEqual(['render.svg', 'browser.png', 'findings.json', 'dom.html'])
  })

  it('maps missing viewBox to fail with repair_and_rerun', () => {
    const summary = buildHarnessSummary({
      ...baseArgs,
      artifacts: {
        svg: null,
        png: null,
        browser_png: null,
        dom_html: null,
        metrics: 'metrics.json',
        findings: 'findings.json',
      },
      metrics: makeMetrics(null),
      findings: [],
    })

    expect(summary.status).toBe('fail')
    expect(summary.next_action).toBe('repair_and_rerun')
    expect(summary.scores).toEqual({
      legibility: 0,
      structural_clarity: 0,
      spatial_balance: null,
      visual_taste: null,
    })
  })

  it('maps empty root structure to fail with repair_and_rerun even when viewBox exists', () => {
    const summary = buildHarnessSummary({
      ...baseArgs,
      artifacts: {
        svg: 'render.svg',
        png: null,
        browser_png: null,
        dom_html: null,
        metrics: 'metrics.json',
        findings: 'findings.json',
      },
      metrics: makeMetrics({ x: 0, y: 0, width: 100, height: 80 }, 0),
      findings: [],
    })

    expect(summary.status).toBe('fail')
    expect(summary.next_action).toBe('repair_and_rerun')
  })

  it('limits top findings to three entries and falls back to unknown finding', () => {
    const summary = buildHarnessSummary({
      ...baseArgs,
      artifacts: {
        svg: 'render.svg',
        png: null,
        browser_png: null,
        dom_html: null,
        metrics: 'metrics.json',
        findings: 'findings.json',
      },
      metrics: makeMetrics({ x: 0, y: 0, width: 100, height: 80 }),
      findings: [{ message: 'first finding' }, {}, { message: 'third finding' }, { message: 'ignored finding' }],
    })

    expect(summary.top_findings).toEqual(['first finding', 'unknown finding', 'third finding'])
  })

  it('derives the pipeline from present artifacts', () => {
    const summary = buildHarnessSummary({
      ...baseArgs,
      artifacts: {
        svg: 'render.svg',
        png: null,
        browser_png: 'browser.png',
        dom_html: null,
        metrics: 'metrics.json',
        findings: 'findings.json',
      },
      metrics: makeMetrics({ x: 0, y: 0, width: 100, height: 80 }),
      findings: [{ message: 'first finding' }],
    })

    expect(summary.pipeline).toEqual(['render-svg', 'inspect-svg', 'capture-browser'])
  })
})
