import { safeAssign, calculateTextDimensions } from '@pintora/core'
import { MessageModel } from './type'
import { SequenceArtistContext, messageFont, BumpType } from '../artist'
import { makeMark } from '../artist-util'

export function drawDivider(context: SequenceArtistContext, divider: MessageModel) {
  const { conf, model } = context
  const container = context.rootMark
  const dividerMargin = conf.dividerMargin
  model.tryBumpType({ [BumpType.Box]: true })
  model.bumpVerticalPos(dividerMargin)
  const dividerTextFont = {
    ...messageFont(conf),
    fontWeight: conf.dividerFontWeight,
  }

  const bounds = model.getBounds()
  const starty = model.verticalPos
  const startx = bounds.startx

  const { width, height } = divider

  const padding = conf.wrapPadding

  const rectWidth = width + conf.wrapPadding * 2
  const rectX = startx + (bounds.stopx - rectWidth) / 2

  const rect = makeMark('rect', {
    x: rectX,
    y: starty,
    width: rectWidth,
    height: height + conf.wrapPadding * 2,
    fill: conf.activationBackground,
    stroke: conf.actorBorderColor,
    lineWidth: 2,
  })

  const textDims = calculateTextDimensions(divider.text)
  const textMark = makeMark('text', {
    text: divider.text,
    fill: conf.dividerTextColor,
    x: rectX + width / 2 + padding,
    y: starty + height / 2 + padding,
    textAlign: 'center',
    textBaseline: 'middle',
    ...dividerTextFont,
  })

  const lineGap = 3
  const line1Y = starty + rect.attrs.height / 2 - lineGap / 2
  const line2Y = line1Y + lineGap
  const line1 = makeMark('line', {
    x1: 0,
    y1: line1Y,
    x2: bounds.stopx,
    y2: line1Y,
    stroke: conf.actorLineColor,
  })
  const line2 = makeMark('line', {
    ...line1.attrs,
    y1: line2Y,
    y2: line2Y,
  })

  const g = makeMark(
    'group',
    {},
    {
      children: [line1, line2, rect, textMark],
      class: 'divider',
    },
  )
  container.children.push(g)

  model.bumpVerticalPos(dividerMargin + textDims.height + padding)

  model.onBoundsFinish(({ bounds }) => {
    const boundWidth = Math.abs(bounds.stopx - bounds.startx)
    const newCenterX = bounds.startx + boundWidth / 2
    const newRectX = newCenterX - rect.attrs.width / 2
    safeAssign(rect.attrs, { x: newRectX })
    safeAssign(textMark.attrs, { x: newCenterX })

    safeAssign(line1.attrs, { x1: bounds.startx })
    safeAssign(line2.attrs, { x1: bounds.startx })
  })
}
