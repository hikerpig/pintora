import { pintoraStandalone } from '@pintora/standalone'

export { renderInCurrentProcess } from './sameprocess-render'
export { renderInSubprocess } from './subprocess-render'
export { render } from './render'

export { pintoraStandalone }

export type { PintoraConfig } from '@pintora/standalone'

export const setConfig = pintoraStandalone.setConfig
export const getConfig = pintoraStandalone.getConfig
