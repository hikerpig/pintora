import { calculateTextDimensions, removeValues, safeAssign } from '@pintora/core'
import { messageFont, SequenceArtistContext } from '../artist'
import { getBaseText, makeLoopLabelBox, makeMark } from '../artist-util'
import { LoopModel, LoopSection } from './type'

/**
 * Draw loop and alt and other alike regions
 */
export function drawLoopTo(context: SequenceArtistContext, loopModel: LoopModel, labelText: string) {
  const { conf, rootMark: mark, model } = context
  // console.log('draw loop', labelText, loopModel)
  const loopLineColor = conf.loopLineColor
  const group = makeMark('group', {}, { children: [], class: 'loop' })
  function drawLoopLine(startx: number, starty: number, stopx: number, stopy: number) {
    const line = makeMark(
      'line',
      {
        x1: startx,
        x2: stopx,
        y1: starty,
        y2: stopy,
        stroke: loopLineColor,
        lineWidth: 2,
        lineDash: [2, 2],
      },
      { class: 'loopline' },
    )
    group.children.push(line)
  }

  function drawSectionBg(section: LoopSection) {
    const sectionBgRect = makeMark('rect', {
      x: startx,
      y: section.y,
      width: stopx - startx,
      height: stopy - section.y,
      fill: section.fill,
      stroke: loopLineColor,
      lineWidth: 2,
      lineDash: [2, 2],
    })
    model.groupBgs.push(sectionBgRect)
  }
  const { startx, starty, stopx, stopy } = loopModel

  const bgRect = makeMark(
    'rect',
    removeValues({
      x: startx,
      y: starty,
      width: stopx - startx,
      height: stopy - starty,
      fill: loopModel.fill,
      stroke: loopLineColor,
      lineWidth: 2,
      lineDash: [2, 2],
    }),
  )
  model.groupBgs.push(bgRect)

  if (loopModel.sections) {
    loopModel.sections.forEach(function (item) {
      drawLoopLine(startx, item.y, loopModel.stopx, item.y)
      if (item.fill) {
        drawSectionBg(item)
      }
    })
  }

  const {
    boxMargin,
    boxTextMargin,
    labelBoxWidth,
    labelBoxHeight,
    messageFontFamily: fontFamily,
    messageFontSize: fontSize,
    messageFontWeight: fontWeight,
    messageTextColor: textColor,
  } = conf

  const tAttrs = getBaseText()
  safeAssign(tAttrs, {
    text: labelText,
    x: startx + boxTextMargin,
    y: starty + boxTextMargin,
    textBaseline: 'top',
    fontFamily,
    fontSize,
    fontWeight,
    fill: textColor,
  })
  const labelTextMark = makeMark('text', tAttrs, { class: 'label-text' })

  const labelTextSize = calculateTextDimensions(labelText, messageFont(conf))
  const labelWidth = Math.max(labelTextSize.width + 2 * boxTextMargin, labelBoxWidth)
  const labelHeight = Math.max(labelTextSize.height + 2 * boxTextMargin, labelBoxHeight)

  const labelWrap = makeLoopLabelBox({ x: startx, y: starty }, labelWidth, labelHeight, 5)
  safeAssign(labelWrap.attrs, {
    fill: conf.actorBackground,
    stroke: loopLineColor,
  })

  const loopWidth = stopx - startx

  const titleMark = makeMark(
    'text',
    {
      text: loopModel.title,
      x: startx + loopWidth / 2 + labelBoxWidth / 2,
      y: starty + boxTextMargin,
      textBaseline: 'top',
      textAlign: 'center',
      fontFamily,
      fontSize,
      fontWeight,
      fill: textColor,
    },
    { class: 'loop__title' },
  )
  group.children.push(labelWrap, labelTextMark, titleMark)

  if (loopModel.sections) {
    loopModel.sections.forEach(function (item, idx) {
      const sectionTitle = item.message.text
      if (sectionTitle) {
        const sectionTitleMark = makeMark(
          'text',
          {
            ...getBaseText(),
            text: sectionTitle,
            x: startx + loopWidth / 2,
            y: loopModel.sections[idx].y + boxTextMargin,
            textAlign: 'center',
            textBaseline: 'top',
            fontFamily,
            fontSize,
            fontWeight,
            fill: conf.messageTextColor,
          },
          { class: 'loop__title' },
        )
        const { height: sectionHeight } = calculateTextDimensions(sectionTitle, messageFont(conf))
        loopModel.sections[idx].height += sectionHeight - (boxMargin + boxTextMargin)
        group.children.push(sectionTitleMark)
      }
    })
  }

  mark.children.push(group)
}
