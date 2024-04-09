import { PintoraConfig, DeepPartial } from '@pintora/standalone'

export type CLIRenderOptions = {
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
  pintoraConfig?: DeepPartial<PintoraConfig>
  /**
   * width of the output, height will be calculated according to the diagram content ratio
   */
  width?: number
  /**
   * Whether we should run render in a subprocess rather in current process.
   * If you call the `render` function, by default this is true, to avoid polluting the global environment.
   */
  renderInSubprocess?: boolean
}
