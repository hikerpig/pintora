import { StyleParam, interpreteStyles } from '@pintora/core'

export { StyleParam, interpreteStyles }

/** parser action */
export type StyleAction = {
  type: 'addStyle'
  key: string
  value: string
}
