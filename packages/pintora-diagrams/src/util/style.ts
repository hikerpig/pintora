import { ConfigParam, interpreteConfigs } from '@pintora/core'

export { ConfigParam, interpreteConfigs }

/** parser action */
export type ConfigAction = {
  type: 'addConfig'
  key: string
  value: string
}
