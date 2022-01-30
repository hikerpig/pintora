import { Text, TSize } from '@pintora/core'
import { makeMark } from '../util/artist-util'
import { ActivityConf } from './config'

/**
 * Based on action text config
 */
export function makeTextMark(conf: ActivityConf, text: string, textDims: TSize, attrs: Partial<Text['attrs']>) {
  return makeMark('text', {
    text,
    width: textDims.width,
    height: textDims.height,
    fill: conf.textColor,
    fontSize: conf.fontSize,
    fontFamily: conf.fontFamily,
    textBaseline: 'middle',
    textAlign: 'center',
    ...attrs,
  })
}
