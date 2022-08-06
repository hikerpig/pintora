import { calculateTextDimensions, removeValues, safeAssign, mat3 } from '@pintora/core'
import { messageFont, boxFont, SequenceArtistContext } from '../artist'
import { getBaseText, makeLoopLabelBox, makeMark } from '../artist-util'
import { LoopModel, LoopSection } from './type'

/**
 * Draw loop and alt and other alike regions
 */
export function drawLoopTo(context: SequenceArtistContext, loopModel: Readonly<LoopModel>, labelText: string) {
  const { conf, rootMark: mark, model } = context
  // console.log('draw loop', labelText, loopModel)
  const loopLineColor = conf.loopLineColor
  const group = makeMark('group', {}, { children: [], class: 'loop' })
  const { startx, starty, stopx, stopy } = loopModel
  const loopWidth = stopx - startx
  group.matrix = mat3.fromTranslation(mat3.create(), [startx, starty])

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
      drawLoopLine(0, item.y - starty, loopWidth, item.y - starty)
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
    x: boxTextMargin,
    y: boxTextMargin,
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

  const labelWrap = makeLoopLabelBox({ x: 0, y: 0 }, labelWidth, labelHeight, 5)
  safeAssign(labelWrap.attrs, {
    fill: conf.actorBackground,
    stroke: loopLineColor,
  })

  const titleMark = makeMark(
    'text',
    {
      text: loopModel.title,
      x: loopWidth / 2 + labelBoxWidth / 2,
      y: boxTextMargin,
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
            x: loopWidth / 2,
            y: loopModel.sections[idx].y - starty + boxTextMargin,
            textAlign: 'center',
            textBaseline: 'top',
            fontFamily,
            fontSize,
            fontWeight,
            fill: conf.messageTextColor,
          },
          { class: 'loop__title' },
        )
        const { height: sectionHeight } = calculateTextDimensions(sectionTitle, boxFont(conf))
        loopModel.sections[idx].height += sectionHeight - (boxMargin + boxTextMargin)
        group.children.push(sectionTitleMark)
      }
    })
  }

  mark.children.push(group)
}
