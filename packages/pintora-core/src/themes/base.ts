export interface ITheme {
  /**
   * Indicate if this is a dark theme, if not specified, will be treat as a light theme
   */
  isDark?: boolean
  /**
   * While toggling between light/dark theme, will switch to this if this is specified
   */
  schemeOppsiteTheme?: string

  primaryColor: string
  secondaryColor: string
  teritaryColor: string

  primaryLineColor: string
  secondaryLineColor: string

  primaryBorderColor: string
  secondaryBorderColor: string

  textColor: string
  primaryTextColor: string
  secondaryTextColor: string
  teritaryTextColor: string

  /**
   * Background color for the canvas, by default, it will be transparent
   */
  canvasBackground?: string
  groupBackground: string
  background1: string
  /**
   * Used in area that needs to display dark text, like erDiagram's atrributes
   */
  lightestBackground?: string

  /**
   * Text color for note, by default, it will be the same with `textColor`
   */
  noteTextColor?: string
  /**
   * Background color for note, by default, it will be slightly light yellow
   */
  noteBackground?: string
}
