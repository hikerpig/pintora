/** action type for `@param` statement */
export type ParamAction = {
  type: 'addParam'
  key: string
  value: string
}

/** action type for `@config` statement */
export type OverrideConfigAction<T = unknown> =
  | {
      type: 'overrideConfig'
      value: T
    }
  | {
      type: 'overrideConfig'
      error: Error
    }

/** action type for `title` statement */
export type SetTitleAction = {
  type: 'setTitle'
  text: string
}
