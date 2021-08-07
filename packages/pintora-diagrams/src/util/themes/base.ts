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

  canvasBackground?: string
  groupBackground: string
  background1: string
  lightestBackground?: string

  noteTextColor?: string
  noteBackground?: string
}

