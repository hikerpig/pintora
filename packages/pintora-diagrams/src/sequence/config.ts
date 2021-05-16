export type SequenceConf = {
  width: number
  height: number
  mirrorActors: boolean
  actorMargin: number
  boxMargin: number
  activationWidth: number

  messageFontFamily: string
  messageFontSize: number
  messageFontWeight: number | string
  wrapPadding: number
  labelBoxWidth: number
}

export const defaultConfig: SequenceConf = {
  mirrorActors: true,
  width: 80,
  height: 50,
  actorMargin: 10,
  boxMargin: 10,
  activationWidth: 10,

  messageFontSize: 16,
  messageFontFamily: 'menlo, sans-serif',
  messageFontWeight: 400,
  wrapPadding: 10,
  labelBoxWidth: 50,
}

