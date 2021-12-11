import { StyleParam } from '../util/style'
import { makeIdCounter } from '@pintora/core'
import { dedent } from '../util/text'

export type Action = {
  id: string
  actionType: string
  message: string
}

export type Condition = {
  id: string
  message: string
  then: {
    label: string
    children: Step[]
  }
  else?: {
    label: string
    children: Step[]
  }
}

export type While = {
  id: string
  message: string
  children: any[]
  confirmLabel: string | undefined
  denyLabel: string | undefined
}

export type Keyword = {
  id: string
  label: string
}

/** element group */
export type AGroup = {
  id: string
  groupType: string
  name: string
  label?: string
  children: Step[]
  parent?: string
  background: string | null
}

export type Switch = {
  id: string
  message: string | undefined
  children: Step[]
}

export type Case = {
  id: string
  confirmLabel: string | undefined
  children: Step[]
}

export type Note = {
  id: string
  text: string
  placement: string
  target?: string
}

export type ArrowLabel = {
  id: string
  text: string
  target?: string
}

type StepValue = Action | Condition | While | Keyword | AGroup | Switch | Case | ArrowLabel

export type Step<T extends StepValue = StepValue> = {
  type: string
  parentId?: string
  value: T
}

export type ActivityDiagramIR = {
  steps: Step[]
  notes: Note[]
  arrowLabels: ArrowLabel[]
}

type ApplyPart =
  | {
      type: 'addStyle'
      key: string
      value: string
    }
  | {
      type: 'addAction'
      action: Action
    }
  | {
      type: 'condition'
      message: string
      then: {
        message: string
        children: ApplyPart[]
      }
      else?: {
        message: string
        children: ApplyPart[]
      }
    }
  | {
      type: 'while'
      message: string
      confirmLabel: string
      denyLabel: string
      children: ApplyPart[]
    }
  | {
      type: 'switch'
      message: string
      children: ApplyPart[]
    }
  | {
      type: 'case'
      confirmLabel: string
      children: ApplyPart[]
    }
  | {
      type: 'keyword'
      label: string
    }
  | {
      type: 'group'
      groupType: string
      name: string
      label?: string
      children: ApplyPart[]
      background: string | null
    }
  | {
      type: 'note'
      text: string
      placement: string
    }
  | {
      type: 'arrowLabel'
      text: string
    }

type DbApplyState = {
  prevStepId?: string | undefined
  parentId?: string | undefined
}

class ActivityDb {
  protected styleParams: StyleParam[] = []
  protected steps: Step[] = []
  protected notes: Note[] = []
  protected arrowLabels: ArrowLabel[] = []
  protected idCounter = makeIdCounter()

  protected makeId() {
    return this.idCounter.next()
  }

  apply(part: ApplyPart, ignoreAdd?: boolean, state?: DbApplyState): Step
  apply(part: ApplyPart[], ignoreAdd?: boolean, state?: DbApplyState): Step[]
  apply(part: ApplyPart | ApplyPart[], ignoreAdd = false, state: DbApplyState = {}): Step | Step[] {
    if (Array.isArray(part)) {
      const partResults: any[] = []
      let currentStep: Step
      part.forEach(p => {
        const result = this.apply(p, ignoreAdd, { ...state, prevStepId: currentStep?.value?.id })
        if (result) {
          partResults.push(result)
          currentStep = result
        }
      })
      return partResults
    }
    if (!part) return
    // console.log('[activity] apply', part)
    let step: Step
    switch (part.type) {
      case 'addAction':
        {
          const action = { ...part.action, id: this.makeId() }
          step = { type: 'action', value: action }
        }
        break
      case 'condition':
        {
          const id = this.makeId()
          const thenResult = this.apply(part.then.children, true, { ...state, parentId: id })
          const condition: Condition = {
            id,
            message: part.message,
            then: {
              label: part.then.message,
              children: thenResult,
            },
          }
          if (part.else) {
            const elseResult = this.apply(part.else.children, true, { ...state, parentId: id })
            condition.else = {
              label: part.else.message,
              children: elseResult,
            }
          }
          step = { type: 'condition', value: condition }
        }
        break
      case 'while': {
        const id = this.makeId()
        const loopResult = this.apply(part.children, true, { ...state, parentId: id })
        const whileSentence: While = {
          id,
          message: part.message,
          children: loopResult,
          confirmLabel: part.confirmLabel,
          denyLabel: part.denyLabel,
        }
        step = { type: 'while', value: whileSentence }
        break
      }
      case 'switch': {
        const id = this.makeId()
        const cases = this.apply(part.children, true, { ...state, parentId: id })
        const switchSentence: Switch = {
          id,
          message: part.message,
          children: cases as any,
        }
        step = { type: 'switch', value: switchSentence }
        break
      }
      case 'case': {
        const id = this.makeId()
        const children = this.apply(part.children, true, { ...state, parentId: id })
        const caseClause: Case = {
          id,
          confirmLabel: part.confirmLabel,
          children,
        }
        step = { type: 'case', value: caseClause }
        break
      }
      case 'keyword': {
        step = { type: 'keyword', value: { id: this.makeId(), label: part.label } }
        break
      }
      case 'group': {
        const id = this.makeId()
        const childrenResult = this.apply(part.children, true, { ...state, parentId: id })
        step = { type: 'group', value: { id, ...part, children: childrenResult } }
        break
      }
      case 'note': {
        const value: Note = { id: this.makeId(), ...part, text: dedent(part.text) }
        const prevStepId = state.prevStepId
        if (prevStepId) {
          value.target = prevStepId
        }
        this.notes.push(value)
        break
      }
      case 'arrowLabel': {
        const value: ArrowLabel = { id: this.makeId(), ...part }
        const prevStepId = state.prevStepId
        if (prevStepId) {
          value.target = prevStepId
        }
        this.arrowLabels.push(value)
        break
      }
      case 'addStyle':
        {
          this.styleParams.push(part)
        }
        break
      default: {
      }
    }
    if (step && !ignoreAdd) {
      this.steps.push(step)
    }
    if (step) {
      step.parentId = state.parentId
    }
    return step as any
  }

  getDiagramIR(): ActivityDiagramIR {
    return {
      steps: this.steps,
      notes: this.notes,
      arrowLabels: this.arrowLabels,
    }
  }

  clear() {
    this.idCounter.reset()
    this.steps = []
    this.notes = []
  }
}

export const db = new ActivityDb()
