export type HarnessStatus = 'ok' | 'suspicious' | 'fail'

export type HarnessDiagramType = 'er' | 'sequence'

export type HarnessCase = {
  id: string
  diagram_type: HarnessDiagramType
  title: string
  input_file: string
  tags: string[]
  checks: string[]
  escalation_policy: {
    capture_browser_on: HarnessStatus[]
  }
  golden: {
    require_svg: boolean
    require_browser_png: boolean
  }
}
