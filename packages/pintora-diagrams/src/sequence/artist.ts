import { GraphicsIR, IDiagramArtist } from '@pintora/core'
import { logger } from '@pintora/core'
import { db, SequenceDiagramIR, LINETYPE, Message } from './db'

let conf: any = {}

const sequenceArtist: IDiagramArtist<SequenceDiagramIR> = {
  draw(ir, config?) {
    // conf = configApi.getConfig().sequence
    db.clear()
    db.setWrap(conf.wrap)
    // bounds.init()
    logger.debug(`C:${JSON.stringify(conf, null, 2)}`)

    // const diagram = select(`[id="${id}"]`)

    // Fetch data from the parsing
    const { actors, messages, title } = ir
    const actorKeys = db.getActorKeys()

    const graphicsIR: GraphicsIR = {
      mark: {
        type: 'group',
        attr: {},
        children: []
      }
    }
    return graphicsIR

    // const maxMessageWidthPerActor = getMaxMessageWidthPerActor(actors, messages)
    // conf.height = calculateActorMargins(actors, maxMessageWidthPerActor)

    // drawActors(diagram, actors, actorKeys, 0)
    // const loopWidths = calculateLoopBounds(messages, actors, maxMessageWidthPerActor)

    // // The arrow head definition is attached to the svg once
    // // svgDraw.insertArrowHead(diagram)
    // // svgDraw.insertArrowCrossHead(diagram)
    // // svgDraw.insertArrowFilledHead(diagram)
    // // svgDraw.insertSequenceNumber(diagram)

    // function activeEnd(msg, verticalPos) {
    //   const activationData = bounds.endActivation(msg)
    //   if (activationData.starty + 18 > verticalPos) {
    //     activationData.starty = verticalPos - 6
    //     verticalPos += 12
    //   }
    //   svgDraw.drawActivation(diagram, activationData, verticalPos, conf, actorActivations(msg.from.actor).length)

    //   bounds.insert(activationData.startx, verticalPos - 10, activationData.stopx, verticalPos)
    // }

    // // Draw the messages/signals
    // let sequenceIndex = 1
    // messages.forEach(function (msg) {
    //   let loopModel, noteModel, msgModel

    //   switch (msg.type) {
    //     case db.LINETYPE.NOTE:
    //       noteModel = msg.noteModel
    //       drawNote(diagram, noteModel)
    //       break
    //     case db.LINETYPE.ACTIVE_START:
    //       bounds.newActivation(msg, diagram, actors)
    //       break
    //     case db.LINETYPE.ACTIVE_END:
    //       activeEnd(msg, bounds.getVerticalPos())
    //       break
    //     case db.LINETYPE.LOOP_START:
    //       adjustLoopHeightForWrap(loopWidths, msg, conf.boxMargin, conf.boxMargin + conf.boxTextMargin, message =>
    //         bounds.newLoop(message),
    //       )
    //       break
    //     case db.LINETYPE.LOOP_END:
    //       loopModel = bounds.endLoop()
    //       svgDraw.drawLoop(diagram, loopModel, 'loop', conf)
    //       bounds.bumpVerticalPos(loopModel.stopy - bounds.getVerticalPos())
    //       bounds.models.addLoop(loopModel)
    //       break
    //     case db.LINETYPE.RECT_START:
    //       adjustLoopHeightForWrap(loopWidths, msg, conf.boxMargin, conf.boxMargin, message =>
    //         bounds.newLoop(undefined, message.message),
    //       )
    //       break
    //     case db.LINETYPE.RECT_END:
    //       loopModel = bounds.endLoop()
    //       svgDraw.drawBackgroundRect(diagram, loopModel)
    //       bounds.models.addLoop(loopModel)
    //       bounds.bumpVerticalPos(loopModel.stopy - bounds.getVerticalPos())
    //       break
    //     case db.LINETYPE.OPT_START:
    //       adjustLoopHeightForWrap(loopWidths, msg, conf.boxMargin, conf.boxMargin + conf.boxTextMargin, message =>
    //         bounds.newLoop(message),
    //       )
    //       break
    //     case db.LINETYPE.OPT_END:
    //       loopModel = bounds.endLoop()
    //       svgDraw.drawLoop(diagram, loopModel, 'opt', conf)
    //       bounds.bumpVerticalPos(loopModel.stopy - bounds.getVerticalPos())
    //       bounds.models.addLoop(loopModel)
    //       break
    //     case db.LINETYPE.ALT_START:
    //       adjustLoopHeightForWrap(loopWidths, msg, conf.boxMargin, conf.boxMargin + conf.boxTextMargin, message =>
    //         bounds.newLoop(message),
    //       )
    //       break
    //     case db.LINETYPE.ALT_ELSE:
    //       adjustLoopHeightForWrap(loopWidths, msg, conf.boxMargin + conf.boxTextMargin, conf.boxMargin, message =>
    //         bounds.addSectionToLoop(message),
    //       )
    //       break
    //     case db.LINETYPE.ALT_END:
    //       loopModel = bounds.endLoop()
    //       svgDraw.drawLoop(diagram, loopModel, 'alt', conf)
    //       bounds.bumpVerticalPos(loopModel.stopy - bounds.getVerticalPos())
    //       bounds.models.addLoop(loopModel)
    //       break
    //     case db.LINETYPE.PAR_START:
    //       adjustLoopHeightForWrap(loopWidths, msg, conf.boxMargin, conf.boxMargin + conf.boxTextMargin, message =>
    //         bounds.newLoop(message),
    //       )
    //       break
    //     case db.LINETYPE.PAR_AND:
    //       adjustLoopHeightForWrap(loopWidths, msg, conf.boxMargin + conf.boxTextMargin, conf.boxMargin, message =>
    //         bounds.addSectionToLoop(message),
    //       )
    //       break
    //     case db.LINETYPE.PAR_END:
    //       loopModel = bounds.endLoop()
    //       svgDraw.drawLoop(diagram, loopModel, 'par', conf)
    //       bounds.bumpVerticalPos(loopModel.stopy - bounds.getVerticalPos())
    //       bounds.models.addLoop(loopModel)
    //       break
    //     default:
    //       try {
    //         // lastMsg = msg
    //         msgModel = msg.msgModel
    //         msgModel.starty = bounds.getVerticalPos()
    //         msgModel.sequenceIndex = sequenceIndex
    //         drawMessage(diagram, msgModel)
    //         bounds.models.addMessage(msgModel)
    //       } catch (e) {
    //         logger.error('error while drawing message', e)
    //       }
    //   }
    //   // Increment sequence counter if msg.type is a line (and not another event like activation or note, etc)
    //   if (
    //     [
    //       db.LINETYPE.SOLID_OPEN,
    //       db.LINETYPE.DOTTED_OPEN,
    //       db.LINETYPE.SOLID,
    //       db.LINETYPE.DOTTED,
    //       db.LINETYPE.SOLID_CROSS,
    //       db.LINETYPE.DOTTED_CROSS,
    //       db.LINETYPE.SOLID_POINT,
    //       db.LINETYPE.DOTTED_POINT,
    //     ].includes(msg.type)
    //   ) {
    //     sequenceIndex++
    //   }
    // })

    // if (conf.mirrorActors) {
    //   // Draw actors below diagram
    //   bounds.bumpVerticalPos(conf.boxMargin * 2)
    //   drawActors(diagram, actors, actorKeys, bounds.getVerticalPos())
    // }

    // const { bounds: box } = bounds.getBounds()

    // // Adjust line height of actor lines now that the height of the diagram is known
    // logger.debug('For line height fix Querying: #' + id + ' .actor-line')
    // const actorLines = selectAll('#' + id + ' .actor-line')
    // actorLines.attr('y2', box.stopy)

    // let height = box.stopy - box.starty + 2 * conf.diagramMarginY
    // if (conf.mirrorActors) {
    //   height = height - conf.boxMargin + conf.bottomMarginAdj
    // }

    // const width = box.stopx - box.startx + 2 * conf.diagramMarginX

    // if (title) {
    //   diagram
    //     .append('text')
    //     .text(title)
    //     .attr('x', (box.stopx - box.startx) / 2 - 2 * conf.diagramMarginX)
    //     .attr('y', -25)
    // }

    // configureSvgSize(diagram, height, width, conf.useMaxWidth)

    // const extraVertForTitle = title ? 40 : 0
    // diagram.attr(
    //   'viewBox',
    //   box.startx -
    //     conf.diagramMarginX +
    //     ' -' +
    //     (conf.diagramMarginY + extraVertForTitle) +
    //     ' ' +
    //     width +
    //     ' ' +
    //     (height + extraVertForTitle),
    // )
    // logger.debug(`bounds models:`, bounds.models)
  },
}

// export const bounds = {
//   data: {
//     startx: undefined,
//     stopx: undefined,
//     starty: undefined,
//     stopy: undefined,
//   },
//   verticalPos: 0,
//   sequenceItems: [],
//   activations: [],
//   models: {
//     getHeight: function () {
//       return (
//         Math.max.apply(null, this.actors.length === 0 ? [0] : this.actors.map(actor => actor.height || 0)) +
//         (this.loops.length === 0 ? 0 : this.loops.map(it => it.height || 0).reduce((acc, h) => acc + h)) +
//         (this.messages.length === 0 ? 0 : this.messages.map(it => it.height || 0).reduce((acc, h) => acc + h)) +
//         (this.notes.length === 0 ? 0 : this.notes.map(it => it.height || 0).reduce((acc, h) => acc + h))
//       )
//     },
//     clear: function () {
//       this.actors = []
//       this.loops = []
//       this.messages = []
//       this.notes = []
//     },
//     addActor: function (actorModel) {
//       this.actors.push(actorModel)
//     },
//     addLoop: function (loopModel) {
//       this.loops.push(loopModel)
//     },
//     addMessage: function (msgModel) {
//       this.messages.push(msgModel)
//     },
//     addNote: function (noteModel) {
//       this.notes.push(noteModel)
//     },
//     lastActor: function () {
//       return this.actors[this.actors.length - 1]
//     },
//     lastLoop: function () {
//       return this.loops[this.loops.length - 1]
//     },
//     lastMessage: function () {
//       return this.messages[this.messages.length - 1]
//     },
//     lastNote: function () {
//       return this.notes[this.notes.length - 1]
//     },
//     actors: [],
//     loops: [],
//     messages: [],
//     notes: [],
//   },
//   init: function () {
//     this.sequenceItems = []
//     this.activations = []
//     this.models.clear()
//     this.data = {
//       startx: undefined,
//       stopx: undefined,
//       starty: undefined,
//       stopy: undefined,
//     }
//     this.verticalPos = 0
//     setConf(db.getConfig())
//   },
//   updateVal: function (obj, key, val, fun) {
//     if (typeof obj[key] === 'undefined') {
//       obj[key] = val
//     } else {
//       obj[key] = fun(val, obj[key])
//     }
//   },
//   updateBounds: function (startx, starty, stopx, stopy) {
//     const _self = this
//     let cnt = 0
//     function updateFn(type) {
//       return function updateItemBounds(item) {
//         cnt++
//         // The loop sequenceItems is a stack so the biggest margins in the beginning of the sequenceItems
//         const n = _self.sequenceItems.length - cnt + 1

//         _self.updateVal(item, 'starty', starty - n * conf.boxMargin, Math.min)
//         _self.updateVal(item, 'stopy', stopy + n * conf.boxMargin, Math.max)

//         _self.updateVal(bounds.data, 'startx', startx - n * conf.boxMargin, Math.min)
//         _self.updateVal(bounds.data, 'stopx', stopx + n * conf.boxMargin, Math.max)

//         if (!(type === 'activation')) {
//           _self.updateVal(item, 'startx', startx - n * conf.boxMargin, Math.min)
//           _self.updateVal(item, 'stopx', stopx + n * conf.boxMargin, Math.max)

//           _self.updateVal(bounds.data, 'starty', starty - n * conf.boxMargin, Math.min)
//           _self.updateVal(bounds.data, 'stopy', stopy + n * conf.boxMargin, Math.max)
//         }
//       }
//     }

//     this.sequenceItems.forEach(updateFn())
//     this.activations.forEach(updateFn('activation'))
//   },
//   insert: function (startx, starty, stopx, stopy) {
//     const _startx = Math.min(startx, stopx)
//     const _stopx = Math.max(startx, stopx)
//     const _starty = Math.min(starty, stopy)
//     const _stopy = Math.max(starty, stopy)

//     this.updateVal(bounds.data, 'startx', _startx, Math.min)
//     this.updateVal(bounds.data, 'starty', _starty, Math.min)
//     this.updateVal(bounds.data, 'stopx', _stopx, Math.max)
//     this.updateVal(bounds.data, 'stopy', _stopy, Math.max)

//     this.updateBounds(_startx, _starty, _stopx, _stopy)
//   },
//   newActivation: function (message, diagram, actors) {
//     const actorRect = actors[message.from.actor]
//     const stackedSize = actorActivations(message.from.actor).length || 0
//     const x = actorRect.x + actorRect.width / 2 + ((stackedSize - 1) * conf.activationWidth) / 2
//     this.activations.push({
//       startx: x,
//       starty: this.verticalPos + 2,
//       stopx: x + conf.activationWidth,
//       stopy: undefined,
//       actor: message.from.actor,
//       anchored: svgDraw.anchorElement(diagram),
//     })
//   },
//   endActivation(message: Message) {
//     // find most recent activation for given actor
//     const lastActorActivationIdx = this.activations
//       .map(function (activation) {
//         return activation.actor
//       })
//       .lastIndexOf(message.from.actor)
//     return this.activations.splice(lastActorActivationIdx, 1)[0]
//   },
//   createLoop: function (title = { message: undefined, wrap: false, width: undefined }, fill) {
//     return {
//       startx: undefined,
//       starty: this.verticalPos,
//       stopx: undefined,
//       stopy: undefined,
//       title: title.message,
//       wrap: title.wrap,
//       width: title.width,
//       height: 0,
//       fill: fill,
//     }
//   },
//   newLoop: function (title = { message: undefined, wrap: false, width: undefined }, fill) {
//     this.sequenceItems.push(this.createLoop(title, fill))
//   },
//   endLoop: function () {
//     return this.sequenceItems.pop()
//   },
//   addSectionToLoop: function (message) {
//     const loop = this.sequenceItems.pop()
//     loop.sections = loop.sections || []
//     loop.sectionTitles = loop.sectionTitles || []
//     loop.sections.push({ y: bounds.getVerticalPos(), height: 0 })
//     loop.sectionTitles.push(message)
//     this.sequenceItems.push(loop)
//   },
//   bumpVerticalPos: function (bump) {
//     this.verticalPos = this.verticalPos + bump
//     this.data.stopy = this.verticalPos
//   },
//   getVerticalPos: function () {
//     return this.verticalPos
//   },
//   getBounds: function () {
//     return { bounds: this.data, models: this.models }
//   },
// }

// export const drawActors = function(diagram, actors, actorKeys, verticalPos) {
//   // Draw the actors
//   let prevWidth = 0;
//   let prevMargin = 0;

//   for (let i = 0; i < actorKeys.length; i++) {
//     const actor = actors[actorKeys[i]];

//     // Add some rendering data to the object
//     actor.width = actor.width || conf.width;
//     actor.height = Math.max(actor.height || conf.height, conf.height);
//     actor.margin = actor.margin || conf.actorMargin;

//     actor.x = prevWidth + prevMargin;
//     actor.y = verticalPos;

//     // Draw the box with the attached line
//     svgDraw.drawActor(diagram, actor, conf);
//     bounds.insert(actor.x, verticalPos, actor.x + actor.width, actor.height);

//     prevWidth += actor.width;
//     prevMargin += actor.margin;
//     bounds.models.addActor(actor);
//   }

//   // Add a margin between the actor boxes and the first arrow
//   bounds.bumpVerticalPos(conf.height);
// };


export default sequenceArtist
