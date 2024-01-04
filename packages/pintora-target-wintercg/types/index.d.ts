import pintoraStandalone from '@pintora/standalone'

export type RuntimeRenderOptions = {
  /**
   * pintora DSL to render
   */
  code: string
  devicePixelRatio?: number | null
  mimeType?: string
  /**
   * Assign extra background color
   */
  backgroundColor?: string
  // pintoraConfig?: DeepPartial<PintoraConfig>
  /**
   * width of the output, height will be calculated according to the diagram content ratio
   */
  width?: number
}

export type PintoraTarget = {
  render(opts: RuntimeRenderOptions): Promise<{
    type: string
    data: any
  }>
}

export default pintoraStandalone
